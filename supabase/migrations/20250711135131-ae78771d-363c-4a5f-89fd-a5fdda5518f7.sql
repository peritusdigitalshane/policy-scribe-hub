-- Add custom last_reviewed date field to documents table
ALTER TABLE public.documents 
ADD COLUMN last_reviewed DATE NULL;

-- Add comment to clarify this is a manually set field
COMMENT ON COLUMN public.documents.last_reviewed IS 'Manually set date indicating when the document was last reviewed or updated by an admin';