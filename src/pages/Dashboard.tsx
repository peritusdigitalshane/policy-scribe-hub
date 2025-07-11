import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  FileText, 
  Users, 
  Building2, 
  Upload,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Settings,
  Download,
  Search
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

interface Document {
  id: string;
  title: string;
  description: string;
  document_type: string;
  status: string;
  version: string;
  file_url: string;
  created_at: string;
}

interface TenantMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  is_active: boolean;
  profiles: Profile;
  tenants: Tenant;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Form states
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "", description: "" });
  const [userForm, setUserForm] = useState({ email: "", firstName: "", lastName: "", password: "", tenantId: "", role: "user" });
  const [documentForm, setDocumentForm] = useState({ title: "", description: "", type: "policy", selectedTenants: [] as string[] });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchTenants();
      fetchUsers();
      fetchDocuments();
      fetchMemberships();
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserRole(data?.role || "user");
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from("user_tenant_memberships")
        .select(`
          *,
          profiles:user_id(*),
          tenants:tenant_id(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const createTenant = async () => {
    try {
      const { error } = await supabase
        .from("tenants")
        .insert([tenantForm]);

      if (error) throw error;

      toast({ title: "Success", description: "Tenant created successfully" });
      setTenantForm({ name: "", slug: "", description: "" });
      fetchTenants();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const createUser = async () => {
    try {
      // Create auth user first using admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userForm.email,
        password: userForm.password,
        email_confirm: true,
        user_metadata: {
          first_name: userForm.firstName,
          last_name: userForm.lastName
        }
      });

      if (authError) throw authError;

      // Create tenant membership if tenant selected
      if (userForm.tenantId) {
        const { error: membershipError } = await supabase
          .from("user_tenant_memberships")
          .insert({
            user_id: authData.user.id,
            tenant_id: userForm.tenantId,
            role: userForm.role as "user" | "tenant_admin" | "super_admin"
          });

        if (membershipError) throw membershipError;
      }

      // Create global role if super admin
      if (userForm.role === 'super_admin') {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: authData.user.id,
            role: userForm.role
          }]);

        if (roleError) throw roleError;
      }

      toast({ title: "Success", description: "User created successfully" });
      setUserForm({ email: "", firstName: "", lastName: "", password: "", tenantId: "", role: "user" });
      fetchUsers();
      fetchMemberships();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) return;

    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data: documentData, error: documentError } = await supabase
        .from("documents")
        .insert({
          title: documentForm.title,
          description: documentForm.description,
          document_type: documentForm.type as "policy" | "standard",
          file_url: publicUrl,
          author_id: user?.id
        })
        .select()
        .single();

      if (documentError) throw documentError;

      // Create tenant permissions
      for (const tenantId of documentForm.selectedTenants) {
        await supabase
          .from("tenant_document_permissions")
          .insert([{
            document_id: documentData.id,
            tenant_id: tenantId,
            can_view: true,
            can_download: true,
            granted_by: user?.id
          }]);
      }

      toast({ title: "Success", description: "Document uploaded successfully" });
      setDocumentForm({ title: "", description: "", type: "policy", selectedTenants: [] });
      setSelectedFile(null);
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (userRole !== "super_admin") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-8">You need super admin privileges to access this dashboard.</p>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>
    );
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">PolicyRegister Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="destructive">Super Admin</Badge>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tenants" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tenants">
              <Building2 className="mr-2 h-4 w-4" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="memberships">
              <Settings className="mr-2 h-4 w-4" />
              Memberships
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenant Management</CardTitle>
                    <CardDescription>Create and manage organization tenants</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Tenant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Tenant</DialogTitle>
                        <DialogDescription>Add a new organization to the platform</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="tenant-name">Organization Name</Label>
                          <Input
                            id="tenant-name"
                            value={tenantForm.name}
                            onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="tenant-slug">Slug</Label>
                          <Input
                            id="tenant-slug"
                            value={tenantForm.slug}
                            onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value })}
                            placeholder="organization-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tenant-description">Description</Label>
                          <Textarea
                            id="tenant-description"
                            value={tenantForm.description}
                            onChange={(e) => setTenantForm({ ...tenantForm, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={createTenant}>Create Tenant</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>{tenant.slug}</TableCell>
                        <TableCell>
                          <Badge variant={tenant.is_active ? "default" : "secondary"}>
                            {tenant.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Create and manage platform users</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>Add a new user to the platform</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="user-firstname">First Name</Label>
                            <Input
                              id="user-firstname"
                              value={userForm.firstName}
                              onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="user-lastname">Last Name</Label>
                            <Input
                              id="user-lastname"
                              value={userForm.lastName}
                              onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="user-email">Email</Label>
                          <Input
                            id="user-email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="user-password">Password</Label>
                          <Input
                            id="user-password"
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="user-tenant">Assign to Tenant</Label>
                          <Select value={userForm.tenantId} onValueChange={(value) => setUserForm({ ...userForm, tenantId: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a tenant" />
                            </SelectTrigger>
                            <SelectContent>
                              {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="user-role">Role</Label>
                          <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={createUser}>Create User</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Library</CardTitle>
                    <CardDescription>Upload and manage documents for tenants</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Upload New Document</DialogTitle>
                        <DialogDescription>Add a document and assign it to tenants</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="doc-title">Title</Label>
                          <Input
                            id="doc-title"
                            value={documentForm.title}
                            onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="doc-description">Description</Label>
                          <Textarea
                            id="doc-description"
                            value={documentForm.description}
                            onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="doc-type">Type</Label>
                          <Select value={documentForm.type} onValueChange={(value) => setDocumentForm({ ...documentForm, type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="policy">Policy</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="doc-file">File</Label>
                          <Input
                            id="doc-file"
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <div>
                          <Label>Assign to Tenants</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {tenants.map((tenant) => (
                              <div key={tenant.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`tenant-${tenant.id}`}
                                  checked={documentForm.selectedTenants.includes(tenant.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDocumentForm({
                                        ...documentForm,
                                        selectedTenants: [...documentForm.selectedTenants, tenant.id]
                                      });
                                    } else {
                                      setDocumentForm({
                                        ...documentForm,
                                        selectedTenants: documentForm.selectedTenants.filter(id => id !== tenant.id)
                                      });
                                    }
                                  }}
                                />
                                <Label htmlFor={`tenant-${tenant.id}`}>{tenant.name}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={uploadDocument} disabled={!selectedFile}>
                          Upload Document
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.document_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc.status === "active" ? "default" : "secondary"}>
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{doc.version}</TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memberships Tab */}
          <TabsContent value="memberships">
            <Card>
              <CardHeader>
                <CardTitle>User Tenant Memberships</CardTitle>
                <CardDescription>View and manage user-tenant relationships</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">
                          {membership.profiles?.first_name} {membership.profiles?.last_name}
                          <div className="text-sm text-muted-foreground">{membership.profiles?.email}</div>
                        </TableCell>
                        <TableCell>{membership.tenants?.name}</TableCell>
                        <TableCell>
                          <Badge variant={membership.role === "super_admin" ? "destructive" : membership.role === "tenant_admin" ? "secondary" : "outline"}>
                            {membership.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={membership.is_active ? "default" : "secondary"}>
                            {membership.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;