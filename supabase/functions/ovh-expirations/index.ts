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

let timeDelta: number | null = null
async function ovhTimestamp(): Promise<number> {
  if (timeDelta === null) {
    const res = await fetch(`${OVH_BASE}/auth/time`)
    if (!res.ok) throw new Error('Impossibile ottenere il timestamp OVH')
    const serverTime = await res.json() as number
    timeDelta = serverTime - Math.floor(Date.now() / 1000)
  }
  return Math.floor(Date.now() / 1000) + timeDelta
}

async function ovhGet(path: string): Promise<unknown> {
  const query = `${OVH_BASE}${path}`
  const ts = await ovhTimestamp()
  const signature = '$1$' + (await sha1Hex(`${AS}+${CK}+GET+${query}++${ts}`))
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

const ROUTE_LABELS: Array<[string, string]> = [
  ['/domain/zone', 'Zona DNS'],
  ['/domain', 'Dominio'],
  ['/hosting/web', 'Hosting Web'],
  ['/hosting/privateDatabase', 'Database'],
  ['/email/domain', 'Email dominio'],
  ['/email/pro', 'Email Pro'],
  ['/email/exchange', 'Exchange'],
  ['/msServices', 'Microsoft'],
  ['/vps', 'VPS'],
  ['/dedicated/server', 'Server dedicato'],
  ['/dedicated/nasha', 'NAS-HA'],
  ['/dedicated/housing', 'Housing'],
  ['/cloud/project', 'Public Cloud'],
  ['/dedicatedCloud', 'Hosted Private Cloud'],
  ['/ip', 'IP'],
  ['/ipLoadbalancing', 'Load Balancer'],
  ['/license', 'Licenza'],
  ['/telephony', 'Telefonia'],
  ['/sms', 'SMS'],
  ['/veeamCloudConnect', 'Veeam'],
  ['/vrack', 'vRack'],
  ['/ssl', 'Certificato SSL'],
  ['/allDom', 'AllDom'],
]

function labelFromRoute(path: string | null): string {
  if (!path) return 'Altro'
  for (const [prefix, label] of ROUTE_LABELS) {
    if (path.startsWith(prefix)) return label
  }
  const seg = path.split('/').filter(Boolean)[0]
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Altro'
}

function num(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

function mapUniversal(detail: Record<string, any>): ServiceItem {
  const billing = detail?.billing ?? {}
  const pricing = billing?.pricing ?? {}
  const renewObj = billing?.renew ?? {}
  const current = renewObj?.current ?? {}
  const resource = detail?.resource ?? {}
  const routePath: string | null = detail?.route?.path ?? null

  const priceValue =
    num(pricing?.price?.value) ??
    num(renewObj?.current?.price?.value) ??
    null
  const currency =
    pricing?.price?.currencyCode ?? renewObj?.current?.price?.currencyCode ?? (priceValue !== null ? 'EUR' : null)

  const mode: string | null = current?.mode ?? renewObj?.mode ?? null
  const renewMode = mode
    ? (mode.toLowerCase().includes('auto') ? 'automatico' : mode.toLowerCase().includes('manual') ? 'manuale' : mode)
    : null

  const period = current?.period ?? pricing?.interval ?? pricing?.duration ?? null

  return {
    category: labelFromRoute(routePath),
    name: resource?.displayName ?? resource?.name ?? detail?.serviceId?.toString() ?? 'servizio',
    expiration: billing?.expirationDate ?? billing?.nextBillingDate ?? null,
    status: detail?.state ?? billing?.lifecycle?.current?.state ?? null,
    renew_mode: renewMode,
    renew_period: period ? String(period) : null,
    price: priceValue,
    currency,
  }
}

// Fallback su endpoint classici quando /services non è accessibile
function mapLegacy(category: string, name: string, info: Record<string, any> | null): ServiceItem {
  if (!info) {
    return { category, name, expiration: null, status: 'errore', renew_mode: null, renew_period: null, price: null, currency: null }
  }
  const renew = info?.renew ?? {}
  const price = num(info?.billing?.pricing?.price?.value)
  return {
    category,
    name,
    expiration: info?.expiration ?? null,
    status: info?.status ?? null,
    renew_mode: renew?.automatic ? 'automatico' : 'manuale',
    renew_period: renew?.period ? String(renew.period) : null,
    price,
    currency: price !== null ? (info?.billing?.pricing?.price?.currencyCode ?? 'EUR') : null,
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit)
    out.push(...await Promise.all(chunk.map(fn)))
  }
  return out
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

    // 1) Endpoint universale: copre TUTTI i prodotti dell'account con prezzi
    let universalOk = false
    try {
      const ids = await ovhGet('/services') as number[]
      universalOk = true
      const details = await mapLimit(ids, 6, async (id) => {
        try {
          return await ovhGet(`/services/${id}`) as Record<string, any>
        } catch (e) {
          errors.push(`servizio ${id}: ${(e as Error).message}`)
          return null
        }
      })
      for (const d of details) {
        if (d) services.push(mapUniversal(d))
      }
    } catch (e) {
      errors.push(`/services: ${(e as Error).message}`)
    }

    // 2) Fallback classico se l'endpoint universale non è disponibile
    if (!universalOk || services.length === 0) {
      const fetchCategory = async (
        category: string,
        listPath: string,
        infoPath: (name: string) => string
      ) => {
        try {
          const names = await ovhGet(listPath) as string[]
          await mapLimit(names, 6, async (name) => {
            try {
              const info = await ovhGet(infoPath(name)) as Record<string, any>
              services.push(mapLegacy(category, name, info))
            } catch (e) {
              services.push(mapLegacy(category, name, null))
              errors.push(`${category}/${name}: ${(e as Error).message}`)
            }
          })
        } catch (e) {
          errors.push(`${category}: ${(e as Error).message}`)
        }
      }

      await fetchCategory('Dominio', '/domain', (n) => `/domain/${encodeURIComponent(n)}/serviceInfos`)
      await fetchCategory('Hosting Web', '/hosting/web', (n) => `/hosting/web/${encodeURIComponent(n)}/serviceInfos`)
      await fetchCategory('VPS', '/vps', (n) => `/vps/${encodeURIComponent(n)}/serviceInfos`)
      await fetchCategory('Server dedicato', '/dedicated/server', (n) => `/dedicated/server/${encodeURIComponent(n)}/serviceInfos`)
      await fetchCategory('Email Pro', '/email/pro', (n) => `/email/pro/${encodeURIComponent(n)}/serviceInfos`)
      await fetchCategory('Exchange', '/email/domain', (n) => `/email/domain/${encodeURIComponent(n)}/serviceInfos`)
    }

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
