-- Grant access to the test document for the LyfeAI tenant
INSERT INTO public.tenant_document_permissions (
  document_id, 
  tenant_id, 
  can_view, 
  can_download, 
  granted_by
)
SELECT 
  '47c9c715-24a6-42c7-9444-0f90e39dad5c',
  '82dd2814-0446-4c73-b93d-2cb7def224a0',
  true,
  false,
  'dc8208ae-89b5-4541-8d02-318394fc62fa'
ON CONFLICT DO NOTHING;