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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  Search,
  Eye,
  Share2,
  Calendar as CalendarIcon,
  FolderOpen,
  Shield,
  Lock,
  Brain,
  Award,
  TreePine,
  Globe
} from "lucide-react";
import TenantAssignmentManager from "@/components/TenantAssignmentManager";
import MembershipManager from "@/components/MembershipManager";

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
  author_id: string;
  created_at: string;
  last_reviewed?: string;
  category?: string;
  category_id?: string;
}

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_active: boolean;
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
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState(false);
  const navigate = useNavigate();

  // Form states
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "", description: "" });
  const [userForm, setUserForm] = useState({ email: "", firstName: "", lastName: "", password: "", tenantId: "", role: "user" });
  const [documentForm, setDocumentForm] = useState({ title: "", description: "", type: "policy", selectedTenants: [] as string[], categoryId: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userAssignmentForm, setUserAssignmentForm] = useState({ userId: "", role: "user" });
  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<string>("");
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", color: "#3B82F6", icon: "folder" });
  const [bulkAssignForm, setBulkAssignForm] = useState({ selectedTenant: "", selectedCategory: "" });

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
      fetchCategories();
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
        .select(`
          *,
          document_categories(name, color, icon)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
      // Use edge function to create user with auto-confirmation
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: userForm.email,
          password: userForm.password,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          tenantId: userForm.tenantId || undefined,
          role: userForm.role
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (!data.success) {
        throw new Error(data.error || 'User creation failed');
      }

      toast({ 
        title: "Success", 
        description: "User created successfully and is immediately active (no email confirmation required)." 
      });
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
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create document record (file_url will store the storage path)
      const { data: documentData, error: documentError } = await supabase
        .from("documents")
        .insert({
          title: documentForm.title,
          description: documentForm.description,
          document_type: documentForm.type as "policy" | "standard",
          file_url: filePath,
          author_id: user?.id,
          category_id: documentForm.categoryId || null
        })
        .select()
        .single();

      if (documentError) throw documentError;

      // Create tenant permissions (view only, no downloads)
      for (const tenantId of documentForm.selectedTenants) {
        await supabase
          .from("tenant_document_permissions")
          .insert([{
            document_id: documentData.id,
            tenant_id: tenantId,
            can_view: true,
            can_download: false, // No downloads allowed
            granted_by: user?.id
          }]);
      }

      toast({ title: "Success", description: "PDF uploaded successfully" });
      setDocumentForm({ title: "", description: "", type: "policy", selectedTenants: [], categoryId: "" });
      setSelectedFile(null);
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const createMagicLinkForDocument = async (documentId: string) => {
    try {
      // Generate a magic token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_magic_token');

      if (tokenError) throw tokenError;

      // Create the magic link
      const { data, error } = await supabase
        .from('document_magic_links')
        .insert({
          document_id: documentId,
          magic_token: tokenData,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Copy the magic link to clipboard
      const magicUrl = `${window.location.origin}/view/${data.magic_token}`;
      await navigator.clipboard.writeText(magicUrl);

      toast({
        title: "Success",
        description: "Magic link created and copied to clipboard!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create magic link",
        variant: "destructive",
      });
    }
  };

  const updateDocumentStatus = async (documentId: string, newStatus: "draft" | "active" | "archived") => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ status: newStatus })
        .eq("id", documentId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Document status updated to ${newStatus}` 
      });
      fetchDocuments();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "Document deleted successfully" 
      });
      fetchDocuments();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const deleteTenant = async (tenantId: string) => {
    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "Tenant deleted successfully" 
      });
      fetchTenants();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const assignUserToTenant = async (userId: string, tenantId: string, role: "user" | "tenant_admin" = "user") => {
    try {
      const { error } = await supabase
        .from("user_tenant_memberships")
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          role: role,
          is_active: true
        });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "User assigned to tenant successfully" 
      });
      fetchMemberships();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const removeUserFromTenant = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from("user_tenant_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "User removed from tenant successfully" 
      });
      fetchMemberships();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const getUsersForTenant = (tenantId: string) => {
    return memberships.filter(m => m.tenant_id === tenantId && m.is_active);
  };

  const getUnassignedUsers = (tenantId: string) => {
    const assignedUserIds = memberships
      .filter(m => m.tenant_id === tenantId && m.is_active)
      .map(m => m.user_id);
    return users.filter(u => !assignedUserIds.includes(u.id));
  };

  const createCategory = async () => {
    try {
      const { error } = await supabase
        .from("document_categories")
        .insert([{
          ...categoryForm,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({ title: "Success", description: "Category created successfully" });
      setCategoryForm({ name: "", description: "", color: "#3B82F6", icon: "folder" });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const bulkAssignDocuments = async () => {
    if (!bulkAssignForm.selectedTenant || selectedDocuments.length === 0) {
      toast({ title: "Error", description: "Please select a tenant and documents", variant: "destructive" });
      return;
    }

    try {
      for (const documentId of selectedDocuments) {
        await supabase
          .from("tenant_document_permissions")
          .insert({
            document_id: documentId,
            tenant_id: bulkAssignForm.selectedTenant,
            can_view: true,
            can_download: false,
            granted_by: user?.id
          });
      }

      toast({ 
        title: "Success", 
        description: `${selectedDocuments.length} documents assigned to tenant successfully` 
      });
      setSelectedDocuments([]);
      setBulkAssignmentMode(false);
      setBulkAssignForm({ selectedTenant: "", selectedCategory: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateDocument = async (documentId: string, updates: {
    title?: string;
    description?: string;
    document_type?: "policy" | "standard" | "procedure" | "form" | "template" | "guideline" | "framework" | "assessment" | "audit" | "certification" | "compliance" | "risk_management" | "cybersecurity" | "privacy" | "workplace_safety" | "quality_management" | "environmental" | "business_continuity" | "incident_response" | "training_material" | "checklist";
    category?: string;
    category_id?: string;
    last_reviewed?: string | null;
  }) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "Document updated successfully" 
      });
      fetchDocuments();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Document categories with icons and descriptions
  const documentCategories = [
    { id: "all", name: "All Documents", icon: FolderOpen, color: "text-gray-500", count: documents.length },
    { id: "iso-standards", name: "ISO Standards", icon: Award, color: "text-blue-500", count: documents.filter(d => d.category?.includes('ISO') || d.title.includes('ISO')).length },
    { id: "cybersecurity", name: "Cyber Security", icon: Shield, color: "text-red-500", count: documents.filter(d => d.category?.includes('Cyber') || d.document_type === 'cybersecurity' || d.title.toLowerCase().includes('cyber')).length },
    { id: "ai-governance", name: "AI Governance", icon: Brain, color: "text-purple-500", count: documents.filter(d => d.title.toLowerCase().includes('ai') || d.title.toLowerCase().includes('artificial intelligence')).length },
    { id: "privacy", name: "Privacy & Data Protection", icon: Lock, color: "text-green-500", count: documents.filter(d => d.document_type === 'privacy' || d.title.toLowerCase().includes('privacy') || d.title.toLowerCase().includes('data protection')).length },
    { id: "workplace-safety", name: "Workplace Safety", icon: TreePine, color: "text-orange-500", count: documents.filter(d => d.document_type === 'workplace_safety' || d.title.toLowerCase().includes('whs') || d.title.toLowerCase().includes('safety')).length },
    { id: "quality-management", name: "Quality Management", icon: Award, color: "text-indigo-500", count: documents.filter(d => d.document_type === 'quality_management' || d.title.toLowerCase().includes('quality')).length },
    { id: "environmental", name: "Environmental", icon: Globe, color: "text-emerald-500", count: documents.filter(d => d.document_type === 'environmental' || d.title.toLowerCase().includes('environmental')).length },
    { id: "compliance", name: "Compliance & Risk", icon: Shield, color: "text-yellow-600", count: documents.filter(d => d.document_type === 'compliance' || d.document_type === 'risk_management' || d.title.toLowerCase().includes('compliance')).length },
  ];

  // Filter documents based on selected category
  const getFilteredDocuments = () => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      switch (selectedCategory) {
        case "iso-standards":
          filtered = filtered.filter(d => d.category?.includes('ISO') || d.title.includes('ISO'));
          break;
        case "cybersecurity":
          filtered = filtered.filter(d => d.category?.includes('Cyber') || d.document_type === 'cybersecurity' || d.title.toLowerCase().includes('cyber'));
          break;
        case "ai-governance":
          filtered = filtered.filter(d => d.title.toLowerCase().includes('ai') || d.title.toLowerCase().includes('artificial intelligence'));
          break;
        case "privacy":
          filtered = filtered.filter(d => d.document_type === 'privacy' || d.title.toLowerCase().includes('privacy') || d.title.toLowerCase().includes('data protection'));
          break;
        case "workplace-safety":
          filtered = filtered.filter(d => d.document_type === 'workplace_safety' || d.title.toLowerCase().includes('whs') || d.title.toLowerCase().includes('safety'));
          break;
        case "quality-management":
          filtered = filtered.filter(d => d.document_type === 'quality_management' || d.title.toLowerCase().includes('quality'));
          break;
        case "environmental":
          filtered = filtered.filter(d => d.document_type === 'environmental' || d.title.toLowerCase().includes('environmental'));
          break;
        case "compliance":
          filtered = filtered.filter(d => d.document_type === 'compliance' || d.document_type === 'risk_management' || d.title.toLowerCase().includes('compliance'));
          break;
      }
    }

    return filtered;
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
            <h1 className="text-2xl font-bold">GovernanceHub Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="destructive">Super Admin</Badge>
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="memberships" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="memberships">
              <Users className="mr-2 h-4 w-4" />
              Memberships
            </TabsTrigger>
            <TabsTrigger value="tenants">
              <Building2 className="mr-2 h-4 w-4" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users (Legacy)
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents
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
                      <TableHead>Actions</TableHead>
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
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Users className="h-4 w-4 mr-1" />
                                  Manage Users
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Manage Users for {tenant.name}</DialogTitle>
                                  <DialogDescription>
                                    Assign or remove users from this tenant
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-6">
                                  {/* Add User Section */}
                                  <div className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-3">Assign New User</h4>
                                    <div className="flex gap-4 items-end">
                                      <div className="flex-1">
                                        <Label>Select User</Label>
                                        <Select 
                                          value={userAssignmentForm.userId} 
                                          onValueChange={(value) => setUserAssignmentForm({ ...userAssignmentForm, userId: value })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Choose a user to assign" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {getUnassignedUsers(tenant.id).map((user) => (
                                              <SelectItem key={user.id} value={user.id}>
                                                {user.first_name} {user.last_name} ({user.email})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="w-40">
                                        <Label>Role</Label>
                                        <Select 
                                          value={userAssignmentForm.role} 
                                          onValueChange={(value) => setUserAssignmentForm({ ...userAssignmentForm, role: value })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Button 
                                        onClick={() => {
                                          if (userAssignmentForm.userId) {
                                            assignUserToTenant(userAssignmentForm.userId, tenant.id, userAssignmentForm.role as "user" | "tenant_admin");
                                            setUserAssignmentForm({ userId: "", role: "user" });
                                          }
                                        }}
                                        disabled={!userAssignmentForm.userId}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Assign
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Current Users Table */}
                                  <div className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-3">Current Users ({getUsersForTenant(tenant.id).length})</h4>
                                    {getUsersForTenant(tenant.id).length > 0 ? (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {getUsersForTenant(tenant.id).map((membership) => (
                                            <TableRow key={membership.id}>
                                              <TableCell className="font-medium">
                                                {membership.profiles.first_name} {membership.profiles.last_name}
                                              </TableCell>
                                              <TableCell>{membership.profiles.email}</TableCell>
                                              <TableCell>
                                                <Badge variant={membership.role === 'tenant_admin' ? "default" : "secondary"}>
                                                  {membership.role.replace('_', ' ')}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Remove User</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Are you sure you want to remove {membership.profiles.first_name} {membership.profiles.last_name} from {tenant.name}?
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction 
                                                        onClick={() => removeUserFromTenant(membership.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                      >
                                                        Remove
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : (
                                      <div className="text-center py-8 text-muted-foreground">
                                        No users assigned to this tenant
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{tenant.name}"? This action cannot be undone and will remove all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteTenant(tenant.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
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
                <CardTitle>Document Library</CardTitle>
                <CardDescription>Manage your governance documents organised by category</CardDescription>
                
                {/* Search and Filter Controls */}
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Input 
                      placeholder="Search documents..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-md"
                    />
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
                           <Label htmlFor="doc-file">PDF File</Label>
                           <Input
                             id="doc-file"
                             type="file"
                             accept=".pdf"
                             onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                           />
                           <p className="text-xs text-muted-foreground mt-1">
                             Only PDF files are supported for secure viewing
                           </p>
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
              
              {/* Category Filter Tabs */}
              <CardContent>
                <div className="mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {documentCategories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <Button
                          key={category.id}
                          variant={selectedCategory === category.id ? "default" : "outline"}
                          className="flex flex-col h-auto p-4 text-left"
                          onClick={() => setSelectedCategory(category.id)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-4 w-4 ${category.color}`} />
                            <span className="font-medium text-sm">{category.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {category.count} {category.count === 1 ? 'document' : 'documents'}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Documents Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Last Reviewed</TableHead>
                      <TableHead>Assigned Tenants</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredDocuments().map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.document_type}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           <Select
                             value={doc.status}
                             onValueChange={(value) => updateDocumentStatus(doc.id, value as "draft" | "active" | "archived")}
                           >
                             <SelectTrigger className="w-24">
                               <SelectValue>
                                 <Badge variant={doc.status === "active" ? "default" : doc.status === "archived" ? "destructive" : "secondary"}>
                                   {doc.status}
                                 </Badge>
                               </SelectValue>
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="draft">
                                 <div className="flex items-center gap-2">
                                   <Badge variant="secondary">draft</Badge>
                                 </div>
                               </SelectItem>
                               <SelectItem value="active">
                                 <div className="flex items-center gap-2">
                                   <Badge variant="default">active</Badge>
                                 </div>
                               </SelectItem>
                               <SelectItem value="archived">
                                 <div className="flex items-center gap-2">
                                   <Badge variant="destructive">archived</Badge>
                                 </div>
                               </SelectItem>
                             </SelectContent>
                           </Select>
                         </TableCell>
                         <TableCell>
                           {users.find(u => u.id === doc.author_id)?.email || 'Unknown'}
                         </TableCell>
                         <TableCell>
                           {doc.last_reviewed ? format(new Date(doc.last_reviewed), 'dd/MM/yyyy') : 'Not set'}
                         </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tenants
                              .filter(tenant => 
                                memberships.some(m => 
                                  m.tenant_id === tenant.id && 
                                  // This will be replaced by actual document permissions
                                  false
                                )
                              )
                              .map(tenant => (
                                <Badge key={tenant.id} variant="secondary" className="text-xs">
                                  {tenant.name}
                                </Badge>
                              ))
                            }
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage Tenant Assignments</DialogTitle>
                                  <DialogDescription>
                                    Assign or remove this document from tenants
                                  </DialogDescription>
                                </DialogHeader>
                                <TenantAssignmentManager documentId={doc.id} />
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                         <TableCell>
                           <div className="flex gap-2">
                              <EditDocumentDialog 
                                document={doc} 
                                onUpdate={updateDocument}
                                categories={categories}
                              />
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(`/view-pdf/${doc.id}`, '_blank')}
                               disabled={!doc.file_url}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => createMagicLinkForDocument(doc.id)}
                               disabled={!doc.file_url}
                             >
                               <Share2 className="h-4 w-4" />
                             </Button>
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button variant="outline" size="sm">
                                   <Trash2 className="h-4 w-4 text-destructive" />
                                 </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>Cancel</AlertDialogCancel>
                                   <AlertDialogAction 
                                     onClick={() => deleteDocument(doc.id)}
                                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                   >
                                     Delete
                                   </AlertDialogAction>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Empty State */}
                {getFilteredDocuments().length === 0 && (
                  <div className="text-center py-8">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No documents found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || selectedCategory !== "all" 
                        ? "Try adjusting your search or category filter" 
                        : "Upload your first document to get started"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memberships Tab - New comprehensive membership management */}
          <TabsContent value="memberships">
            <MembershipManager />
                </TabsContent>

                <TabsContent value="categories">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Category Management
                      </CardTitle>
                      <CardDescription>Create and manage document categories</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Category
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Category</DialogTitle>
                              <DialogDescription>Add a new document category</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="cat-name">Category Name</Label>
                                <Input
                                  id="cat-name"
                                  placeholder="e.g., IT Policies"
                                  value={categoryForm.name}
                                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="cat-description">Description</Label>
                                <Textarea 
                                  id="cat-description"
                                  placeholder="Category description"
                                  value={categoryForm.description}
                                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="cat-color">Color</Label>
                                <Input
                                  id="cat-color"
                                  type="color"
                                  value={categoryForm.color}
                                  onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={createCategory}>Create Category</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Documents</TableHead>
                              <TableHead>Color</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categories.map((category) => (
                              <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell>{category.description || 'No description'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {documents.filter(d => d.category_id === category.id).length} documents
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div 
                                    className="w-6 h-6 rounded-full border" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                </TableCell>
                                <TableCell>{new Date(category.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
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

// Edit Document Dialog Component
const EditDocumentDialog = ({ document, onUpdate, categories }: { 
  document: any; 
  onUpdate: (id: string, updates: any) => void;
  categories: DocumentCategory[];
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || '');
  const [documentType, setDocumentType] = useState(document.document_type);
  const [categoryId, setCategoryId] = useState(document.category_id || '');
  const [lastReviewed, setLastReviewed] = useState<Date | undefined>(
    document.last_reviewed ? new Date(document.last_reviewed) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      title,
      description,
      document_type: documentType,
      category_id: categoryId,
      last_reviewed: lastReviewed ? format(lastReviewed, 'yyyy-MM-dd') : null,
    };

    await onUpdate(document.id, updates);
    setOpen(false);
  };

  const documentTypes = [
    'policy', 'standard', 'procedure', 'form', 'template', 'guideline', 
    'framework', 'assessment', 'audit', 'certification', 'compliance',
    'risk_management', 'cybersecurity', 'privacy', 'workplace_safety',
    'quality_management', 'environmental', 'business_continuity',
    'incident_response', 'training_material', 'checklist'
  ];


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update document details and set last reviewed date
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Last Reviewed Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !lastReviewed && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {lastReviewed ? format(lastReviewed, "dd/MM/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={lastReviewed}
                  onSelect={setLastReviewed}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Document</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Dashboard;