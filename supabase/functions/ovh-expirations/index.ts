import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OVH_BASE = 'https://eu.api.ovh.com/1.0'

const AK = Deno.env.get('OVH_APPLICATION_KEY') ?? ''
const AS = Deno.env.get('OVH_APPLICATION_SECRET') ?? ''
const CK = Deno.env.get('OVH_CONSUMER_KEY') ?? ''

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function ovhTime(): Promise<number> {
  const res = await fetch(`${OVH_BASE}/auth/time`)
  if (!res.ok) throw new Error('Impossibile ottenere il timestamp OVH')
  return await res.json()
}

async function ovhGet(path: string): Promise<unknown> {
  const query = `${OVH_BASE}${path}`
  const ts = await ovhTime()
  const body = ''
  const signature = '$1$' + (await sha1Hex(`${AS}+${CK}+GET+${query}+${body}+${ts}`))
  const res = await fetch(query, {
    method: 'GET',
    headers: {
      'X-Ovh-Application': AK,
      'X-Ovh-Consumer': CK,
      'X-Ovh-Timestamp': String(ts),
      'X-Ovh-Signature': signature,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OVH ${path}: ${res.status} ${text.slice(0, 200)}`)
  }
  return res.json()
}

interface ServiceItem {
  category: string
  name: string
  expiration: string | null
  status: string | null
  renew_mode: string | null
  renew_period: string | null
  price: number | null
  currency: string | null
}

function extractPrice(info: Record<string, unknown>): { price: number | null; currency: string | null } {
  try {
    const billing = info?.billing as Record<string, unknown> | undefined
    const pricing = billing?.pricing as Record<string, unknown> | undefined
    const priceObj = pricing?.price as Record<string, unknown> | undefined
    const value = priceObj?.value
    if (typeof value === 'number') {
      return { price: value, currency: (priceObj?.currencyCode as string) ?? 'EUR' }
    }
  } catch { /* ignore */ }
  return { price: null, currency: null }
}

function mapService(category: string, name: string, info: Record<string, unknown> | null): ServiceItem {
  if (!info) {
    return { category, name, expiration: null, status: 'errore', renew_mode: null, renew_period: null, price: null, currency: null }
  }
  const renew = info?.renew as Record<string, unknown> | undefined
  const { price, currency } = extractPrice(info)
  return {
    category,
    name,
    expiration: (info?.expiration as string) ?? null,
    status: (info?.status as string) ?? null,
    renew_mode: renew?.automatic ? 'automatico' : 'manuale',
    renew_period: renew?.period ? String(renew.period) : null,
    price,
    currency,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!AK || !AS || !CK) {
      return new Response(JSON.stringify({ error: 'Credenziali OVH non configurate' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verifica utente admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: 'Accesso negato' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const services: ServiceItem[] = []
    const errors: string[] = []

    const fetchCategory = async (
      category: string,
      listPath: string,
      infoPath: (name: string) => string
    ) => {
      try {
        const names = await ovhGet(listPath) as string[]
        for (const name of names) {
          try {
            const info = await ovhGet(infoPath(name)) as Record<string, unknown>
            services.push(mapService(category, name, info))
          } catch (e) {
            services.push(mapService(category, name, null))
            errors.push(`${category}/${name}: ${(e as Error).message}`)
          }
        }
      } catch (e) {
        errors.push(`${category}: ${(e as Error).message}`)
      }
    }

    await fetchCategory('Dominio', '/domain', (n) => `/domain/${encodeURIComponent(n)}/serviceInfos`)
    await fetchCategory('Hosting', '/hosting/web', (n) => `/hosting/web/${encodeURIComponent(n)}/serviceInfos`)
    await fetchCategory('VPS', '/vps', (n) => `/vps/${encodeURIComponent(n)}/serviceInfos`)
    await fetchCategory('Server dedicato', '/dedicated/server', (n) => `/dedicated/server/${encodeURIComponent(n)}/serviceInfos`)

    services.sort((a, b) => {
      if (!a.expiration) return 1
      if (!b.expiration) return -1
      return a.expiration.localeCompare(b.expiration)
    })

    return new Response(JSON.stringify({ services, errors }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
