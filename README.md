# GovernanceHub - A Peritus Digital Platform

A comprehensive governance, policy and standards management system with multi-tenant support, secure document sharing via magic links, and role-based access control.

## Features

- **Multi-tenant Architecture**: Isolate documents and users by tenant
- **Role-based Access Control**: Super Admin, Tenant Admin, and User roles
- **Secure Document Sharing**: Magic links with view limits and expiration
- **PDF Security**: View-only PDFs with download protection
- **User Management**: Create users and assign roles and tenants
- **Document Permissions**: Granular control over document access per tenant

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- At least 1GB RAM available
- Port 3000 available

### 1. Clone and Build

```bash
# Clone the repository (or extract the source code)
cd governance-hub

# Build and start the container
docker-compose up -d --build
```

### 2. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Initial Setup

The application comes with a pre-configured super admin account:

**Email**: `admin@governancehub.com`  
**Password**: Create this account through the signup process

1. Click "Sign Up" on the login page
2. Use the email `admin@governancehub.com`
3. Create a password
4. This account will automatically receive super admin privileges

## Production Deployment

### Environment Configuration

For production deployment, update the following in `src/integrations/supabase/client.ts`:

```typescript
// Update these values for your Supabase instance
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'your-anon-key'
```

### SSL/HTTPS Setup

For production with SSL, uncomment and configure the nginx-proxy service in `docker-compose.yml`:

```yaml
nginx-proxy:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./proxy.conf:/etc/nginx/nginx.conf:ro
    - ./ssl:/etc/nginx/ssl:ro
  depends_on:
    - policy-register
  restart: unless-stopped
```

### Custom Domain

1. Update your DNS to point to your server
2. Configure SSL certificates in the `./ssl` directory
3. Update `proxy.conf` with your domain configuration

## Database Setup (Supabase)

This application requires a Supabase backend. The current configuration points to a pre-configured instance, but for production use, you should:

### 1. Create Your Own Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Apply Database Schema

Run the following SQL in your Supabase SQL editor to set up the database:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'user');

-- Create document enums
CREATE TYPE document_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE document_type AS ENUM ('policy', 'standard');

-- Apply all migrations from the supabase/migrations directory
-- (Copy and paste each migration file in order)
```

### 3. Update Configuration

Update `src/integrations/supabase/client.ts` with your project details:

```typescript
const SUPABASE_URL = 'https://your-project-ref.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'your-project-anon-key'
```

### 4. Configure Storage

1. In Supabase dashboard, go to Storage
2. Create a bucket named "documents"
3. Set appropriate RLS policies for file access

## User Roles and Permissions

### Super Admin
- Manage all tenants, users, and documents
- Create and assign users to tenants
- Access all system settings
- Manage document permissions across all tenants

### Tenant Admin
- Manage users within their tenant
- Upload and manage documents for their tenant
- Assign document permissions within their tenant
- View tenant-specific analytics

### User
- View documents assigned to their tenant
- Access documents via magic links
- Update their own profile

## Document Management

### Upload Documents
1. Go to Documents tab
2. Click "Upload Document"
3. Fill in document details and select file
4. Assign to appropriate tenants

### Share Documents
1. Find document in the list
2. Click "Share" button
3. Generate magic link
4. Copy and share the secure link

### Magic Links
- Configurable expiration dates
- View count limits
- Secure viewing with download protection
- Automatic access logging

## API Integration

The application uses Supabase for all backend operations:

- **Authentication**: Built-in auth with email/password
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Secure file storage for documents
- **Real-time**: Live updates for collaborative features

## Customization

### Branding
- Update logos and colors in `src/index.css`
- Modify themes in `tailwind.config.ts`
- Customize components in `src/components/`

### Additional Features
- Add custom document types in database enums
- Extend user roles and permissions
- Integrate with external authentication providers
- Add audit logging and analytics

## Security Features

### Document Security
- View-only PDF rendering
- Disabled download and print options
- Magic link access control
- Session-based viewing with expiration

### Authentication Security
- Row Level Security (RLS) policies
- Role-based access control
- Secure session management
- Protected API endpoints

### Infrastructure Security
- Nginx security headers
- Request size limits
- Hidden server tokens
- Access logging

## Monitoring and Logs

### Application Logs
```bash
# View container logs
docker-compose logs -f policy-register

# View nginx access logs
docker exec -it policy-register_policy-register_1 tail -f /var/log/nginx/access.log
```

### Health Checks
The application includes health check endpoints:
- `http://localhost:3000/health` - Application health status

## Backup and Recovery

### Database Backup
Use Supabase's built-in backup features or set up custom backup scripts:

```bash
# Example backup script (requires Supabase CLI)
supabase db dump > backup-$(date +%Y%m%d).sql
```

### File Storage Backup
Implement regular backups of the Supabase storage bucket containing documents.

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "8080:80"  # Use port 8080 instead
   ```

2. **Database connection issues**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Review Supabase project status

3. **File upload failures**
   - Check Supabase storage bucket configuration
   - Verify file size limits
   - Review storage RLS policies

### Logs and Debugging
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 policy-register

# Access container shell
docker exec -it policy-register_policy-register_1 sh
```

## Support and Updates

### Updating the Application
1. Pull latest code changes
2. Rebuild the container:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Database Migrations
Apply new migrations through the Supabase dashboard SQL editor.

## License

This project is configured for self-hosted deployment. Please ensure compliance with all licensing requirements for included dependencies.

---

For technical support or questions about deployment, refer to the application logs and Supabase documentation.

**GovernanceHub** is a Peritus Digital platform designed for enterprise governance and compliance management.