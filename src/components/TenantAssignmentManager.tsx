import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X } from "lucide-react";

interface TenantAssignmentManagerProps {
  documentId: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface DocumentPermission {
  id: string;
  tenant_id: string;
  can_view: boolean;
  can_download: boolean;
  tenants: Tenant;
}

const TenantAssignmentManager = ({ documentId }: TenantAssignmentManagerProps) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTenantsAndPermissions();
  }, [documentId]);

  const fetchTenantsAndPermissions = async () => {
    try {
      // Fetch all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true);

      if (tenantsError) throw tenantsError;

      // Fetch current document permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('tenant_document_permissions')
        .select(`
          *,
          tenants(*)
        `)
        .eq('document_id', documentId);

      if (permissionsError) throw permissionsError;

      setTenants(tenantsData || []);
      setPermissions(permissionsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load tenant data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTenantAssignment = async (tenantId: string) => {
    try {
      const existingPermission = permissions.find(p => p.tenant_id === tenantId);

      if (existingPermission) {
        // Remove permission
        const { error } = await supabase
          .from('tenant_document_permissions')
          .delete()
          .eq('id', existingPermission.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Document removed from tenant",
        });
      } else {
        // Add permission
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('tenant_document_permissions')
          .insert({
            document_id: documentId,
            tenant_id: tenantId,
            can_view: true,
            can_download: false,
            granted_by: user?.id
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Document assigned to tenant",
        });
      }

      // Refresh permissions
      await fetchTenantsAndPermissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Select tenants to assign this document to:</Label>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tenants.map((tenant) => {
          const hasPermission = permissions.some(p => p.tenant_id === tenant.id);
          
          return (
            <div
              key={tenant.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-muted-foreground">{tenant.slug}</p>
              </div>
              
              <Button
                variant={hasPermission ? "default" : "outline"}
                size="sm"
                onClick={() => toggleTenantAssignment(tenant.id)}
              >
                {hasPermission ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Assigned
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Not Assigned
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          No active tenants found
        </div>
      )}
    </div>
  );
};

export default TenantAssignmentManager;