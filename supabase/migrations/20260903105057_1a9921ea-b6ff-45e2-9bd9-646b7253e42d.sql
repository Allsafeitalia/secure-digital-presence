REVOKE EXECUTE ON FUNCTION public.client_set_payment_method(text, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.client_set_payment_method(text, uuid, text) TO authenticated;