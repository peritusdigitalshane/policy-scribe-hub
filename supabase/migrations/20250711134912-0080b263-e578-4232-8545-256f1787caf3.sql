-- Expand document_type enum to cover all governance areas
ALTER TYPE document_type ADD VALUE 'procedure';
ALTER TYPE document_type ADD VALUE 'form';
ALTER TYPE document_type ADD VALUE 'template';
ALTER TYPE document_type ADD VALUE 'guideline';
ALTER TYPE document_type ADD VALUE 'framework';
ALTER TYPE document_type ADD VALUE 'assessment';
ALTER TYPE document_type ADD VALUE 'audit';
ALTER TYPE document_type ADD VALUE 'certification';
ALTER TYPE document_type ADD VALUE 'compliance';
ALTER TYPE document_type ADD VALUE 'risk_management';
ALTER TYPE document_type ADD VALUE 'cybersecurity';
ALTER TYPE document_type ADD VALUE 'privacy';
ALTER TYPE document_type ADD VALUE 'workplace_safety';
ALTER TYPE document_type ADD VALUE 'quality_management';
ALTER TYPE document_type ADD VALUE 'environmental';
ALTER TYPE document_type ADD VALUE 'business_continuity';
ALTER TYPE document_type ADD VALUE 'incident_response';
ALTER TYPE document_type ADD VALUE 'training_material';
ALTER TYPE document_type ADD VALUE 'checklist';

-- Add categories to better organise documents
UPDATE documents SET category = 'ISO Standards' WHERE category IS NULL AND (title ILIKE '%ISO%' OR content ILIKE '%ISO%');
UPDATE documents SET category = 'Cyber Insurance' WHERE category IS NULL AND (title ILIKE '%cyber%' OR title ILIKE '%security%' OR content ILIKE '%cyber%' OR content ILIKE '%security%');
UPDATE documents SET category = 'Australian Standards' WHERE category IS NULL AND (title ILIKE '%AS/NZS%' OR title ILIKE '%australian%' OR content ILIKE '%AS/NZS%' OR content ILIKE '%australian%');

-- Create some example categories for better organisation
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('document_categories', '["ISO Standards", "Cyber Insurance", "Australian Standards", "Privacy & Data Protection", "Workplace Health & Safety", "Quality Management", "Environmental Management", "Business Continuity", "Risk Management", "Compliance"]'::jsonb, 'Available document categories for organisation');

-- Add some predefined tags for common governance areas
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('common_tags', '["ISO-27001", "ISO-9001", "ISO-14001", "NIST", "SOC-2", "AS/NZS-4360", "Privacy-Act", "WHS", "GDPR", "Risk-Assessment", "Audit", "Compliance", "Security", "Quality", "Environmental", "Training"]'::jsonb, 'Common tags used across governance documents');