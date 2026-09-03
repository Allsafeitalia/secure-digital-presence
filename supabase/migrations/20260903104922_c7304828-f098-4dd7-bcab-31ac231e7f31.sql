
CREATE POLICY "Clients can create own maintenance requests"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = maintenance_requests.client_id AND c.client_user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.client_services s WHERE s.id = maintenance_requests.service_id AND s.client_id = maintenance_requests.client_id)
  AND status = 'open'
  AND cost IS NULL
  AND payment_status = 'pending'
);

CREATE OR REPLACE FUNCTION public.client_set_payment_method(
  p_item_type text,
  p_item_id uuid,
  p_method text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_method NOT IN ('bank_transfer','paypal') THEN
    RAISE EXCEPTION 'Metodo di pagamento non valido';
  END IF;

  IF p_item_type = 'service' THEN
    UPDATE public.client_services s
    SET payment_method = p_method,
        payment_notes = 'Pagamento ' || p_method || ' in attesa di verifica - Ordine: ' || COALESCE(s.order_number,'')
    WHERE s.id = p_item_id
      AND s.payment_status = 'pending'
      AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = s.client_id AND c.client_user_id = auth.uid());
  ELSIF p_item_type = 'maintenance' THEN
    UPDATE public.maintenance_requests m
    SET payment_method = p_method,
        payment_notes = 'Pagamento ' || p_method || ' in attesa di verifica - Ordine: ' || COALESCE(m.order_number,'')
    WHERE m.id = p_item_id
      AND m.payment_status = 'pending'
      AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = m.client_id AND c.client_user_id = auth.uid());
  ELSE
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_set_payment_method(text, uuid, text) TO authenticated;
GRANT INSERT ON public.maintenance_requests TO authenticated;
