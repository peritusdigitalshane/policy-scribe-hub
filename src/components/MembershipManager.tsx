import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Shield, 
  Users, 
  Building2, 
  Info, 
  Edit, 
  Trash2,
  Crown,
  UserCheck,
  Eye
} from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface UserMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profiles: User;
  tenants: Tenant;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const MembershipManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [userForm, setUserForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "user" as "user" | "tenant_admin" | "super_admin",
    selectedTenants: [] as string[]
  });

  const roleDescriptions = {
    super_admin: {
      title: "Super Administrator",
      color: "destructive" as const,
      icon: <Crown className="h-4 w-4" />,
      permissions: [
        "Full platform access and control",
        "Create and manage all tenants",
        "Create and manage all users",
        "Upload and assign documents globally",
        "Configure system settings",
        "Access analytics and reporting",
        "Manage magic link settings"
      ]
    },
    tenant_admin: {
      title: "Tenant Administrator", 
      color: "secondary" as const,
      icon: <UserCheck className="h-4 w-4" />,
      permissions: [
        "Manage users within assigned tenants",
        "Upload documents for their tenants",
        "Create magic links for tenant documents",
        "View tenant-specific analytics",
        "Manage tenant member permissions",
        "Access tenant document library"
      ]
    },
    user: {
      title: "Standard User",
      color: "outline" as const,
      icon: <Users className="h-4 w-4" />,
      permissions: [
        "View documents assigned to their tenants",
        "Upload documents to assigned tenants",
        "Create magic links for accessible documents",
        "Secure PDF viewing (view-only)",
        "Search and filter tenant documents"
      ]
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('name');

      if (tenantsError) throw tenantsError;

      // Fetch memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('user_tenant_memberships')
        .select(`
          *,
          profiles(*),
          tenants(*)
        `)
        .order('created_at', { ascending: false });

      if (membershipsError) throw membershipsError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      setUsers(usersData || []);
      setTenants(tenantsData || []);
      setMemberships(membershipsData || []);
      setUserRoles(rolesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUserWithMembership = async () => {
    try {
      if (!userForm.email || !userForm.password || !userForm.first_name || !userForm.last_name) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            first_name: userForm.first_name,
            last_name: userForm.last_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Wait a moment for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Assign global role
      if (userForm.role !== "user") {
        await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: userForm.role
          });
      }

      // Create tenant memberships
      for (const tenantId of userForm.selectedTenants) {
        await supabase
          .from('user_tenant_memberships')
          .insert({
            user_id: authData.user.id,
            tenant_id: tenantId,
            role: userForm.role,
            is_active: true
          });
      }

      toast({
        title: "Success",
        description: "User created successfully with tenant assignments",
      });

      // Reset form
      setUserForm({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        role: "user",
        selectedTenants: []
      });

      // Refresh data
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || "user";
  };

  const getUserTenants = (userId: string) => {
    return memberships
      .filter(m => m.user_id === userId && m.is_active)
      .map(m => m.tenants);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading membership data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Role Permissions Guide
          </CardTitle>
          <CardDescription>
            Understanding what each role can access in the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(roleDescriptions).map(([role, info]) => (
              <Card key={role} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {info.icon}
                      <CardTitle className="text-base">{info.title}</CardTitle>
                    </div>
                    <Badge variant={info.color}>{role.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {info.permissions.map((permission, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{permission}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create User Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </CardTitle>
              <CardDescription>
                Create a user account and assign them to tenants with specific roles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={userForm.first_name}
                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={userForm.last_name}
                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Global Role</Label>
            <Select 
              value={userForm.role} 
              onValueChange={(value) => setUserForm({ ...userForm, role: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Standard User</SelectItem>
                <SelectItem value="tenant_admin">Tenant Administrator</SelectItem>
                <SelectItem value="super_admin">Super Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign to Tenants</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`create-tenant-${tenant.id}`}
                    checked={userForm.selectedTenants.includes(tenant.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserForm({
                          ...userForm,
                          selectedTenants: [...userForm.selectedTenants, tenant.id]
                        });
                      } else {
                        setUserForm({
                          ...userForm,
                          selectedTenants: userForm.selectedTenants.filter(id => id !== tenant.id)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={`create-tenant-${tenant.id}`} className="text-sm">
                    {tenant.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={createUserWithMembership} 
            className="w-full"
            disabled={!userForm.email || !userForm.password || !userForm.first_name || !userForm.last_name}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create User & Assign Memberships
          </Button>
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage existing users, their roles, and tenant assignments
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Global Role</TableHead>
                <TableHead>Tenant Memberships</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const userRole = getUserRole(user.id);
                const userTenants = getUserTenants(user.id);
                const roleInfo = roleDescriptions[userRole as keyof typeof roleDescriptions];

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleInfo?.color || "outline"} className="flex items-center gap-1 w-fit">
                        {roleInfo?.icon}
                        {roleInfo?.title || "Standard User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userTenants.map((tenant) => (
                          <Badge key={tenant.id} variant="secondary" className="text-xs">
                            {tenant.name}
                          </Badge>
                        ))}
                        {userTenants.length === 0 && (
                          <span className="text-sm text-muted-foreground">No assignments</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipManager;