CREATE OR REPLACE FUNCTION public.client_ensure_order_number(p_item_type text, p_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing text;
  v_prefix text;
  v_year text := TO_CHAR(NOW(), 'YY');
  v_seq integer;
  v_new text;
BEGIN
  IF p_item_type = 'service' THEN
    SELECT s.order_number INTO v_existing
    FROM public.client_services s
    WHERE s.id = p_item_id
      AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = s.client_id AND c.client_user_id = auth.uid());
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Elemento non trovato';
    END IF;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
    v_prefix := 'SRV';
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 6) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.client_services
    WHERE order_number LIKE v_prefix || v_year || '%';
    v_new := v_prefix || v_year || LPAD(v_seq::text, 5, '0');
    UPDATE public.client_services SET order_number = v_new WHERE id = p_item_id;
    RETURN v_new;
  ELSIF p_item_type = 'maintenance' THEN
    SELECT m.order_number INTO v_existing
    FROM public.maintenance_requests m
    WHERE m.id = p_item_id
      AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = m.client_id AND c.client_user_id = auth.uid());
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Elemento non trovato';
    END IF;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
    v_prefix := 'HLP';
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 6) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.maintenance_requests
    WHERE order_number LIKE v_prefix || v_year || '%';
    v_new := v_prefix || v_year || LPAD(v_seq::text, 5, '0');
    UPDATE public.maintenance_requests SET order_number = v_new WHERE id = p_item_id;
    RETURN v_new;
  ELSE
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.client_ensure_order_number(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_ensure_order_number(text, uuid) TO authenticated;
