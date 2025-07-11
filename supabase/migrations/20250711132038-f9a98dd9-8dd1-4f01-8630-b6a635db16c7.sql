-- Fix the generate_magic_token function to use proper base64url encoding
-- PostgreSQL's encode() function doesn't support 'base64url', so we need to implement it manually
CREATE OR REPLACE FUNCTION public.generate_magic_token()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  base64_token text;
BEGIN
  -- Generate base64 encoded token
  base64_token := encode(gen_random_bytes(32), 'base64');
  
  -- Convert base64 to base64url format:
  -- Replace + with -, / with _, and remove padding =
  base64_token := replace(replace(trim(trailing '=' from base64_token), '+', '-'), '/', '_');
  
  RETURN base64_token;
END;
$function$;