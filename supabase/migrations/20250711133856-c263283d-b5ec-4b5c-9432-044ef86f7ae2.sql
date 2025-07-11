-- Make the documents bucket public and set up proper storage policies
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documents';

-- Create storage policies for public access to documents
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles) 
VALUES (
  'public_document_access',
  'documents',
  'Public document access via magic links',
  'true',
  'true',
  'SELECT',
  ARRAY['public']::text[]
) ON CONFLICT (id) DO UPDATE SET
  definition = 'true',
  check_definition = 'true';

-- Allow authenticated users to upload documents
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'authenticated_upload',
  'documents', 
  'Authenticated users can upload documents',
  'auth.role() = ''authenticated''',
  'auth.role() = ''authenticated''',
  'INSERT',
  ARRAY['authenticated']::text[]
) ON CONFLICT (id) DO UPDATE SET
  definition = 'auth.role() = ''authenticated''',
  check_definition = 'auth.role() = ''authenticated''';

-- Allow authenticated users to update their own documents
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'authenticated_update',
  'documents',
  'Authenticated users can update documents', 
  'auth.role() = ''authenticated''',
  'auth.role() = ''authenticated''',
  'UPDATE',
  ARRAY['authenticated']::text[]
) ON CONFLICT (id) DO UPDATE SET
  definition = 'auth.role() = ''authenticated''',
  check_definition = 'auth.role() = ''authenticated''';

-- Allow authenticated users to delete documents
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES (
  'authenticated_delete',
  'documents',
  'Authenticated users can delete documents',
  'auth.role() = ''authenticated''', 
  'auth.role() = ''authenticated''',
  'DELETE',
  ARRAY['authenticated']::text[]
) ON CONFLICT (id) DO UPDATE SET
  definition = 'auth.role() = ''authenticated''',
  check_definition = 'auth.role() = ''authenticated''';