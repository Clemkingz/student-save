-- Every screen now uses the money RPCs, which check the PIN themselves.
drop function public.verify_pin(text);
