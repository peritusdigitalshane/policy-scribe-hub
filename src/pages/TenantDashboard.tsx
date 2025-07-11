import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Upload, 
  Plus, 
  LogOut, 
  Search, 
  Eye, 
  Share2,
  Building2,
  Users,
  Download
} from "lucide-react";

const TenantDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userTenants, setUserTenants] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form states
  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    type: "policy" as "policy" | "standard",
    selectedTenants: [] as string[]
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        setUser(user);

        // Check user role and tenant memberships
        const { data: userRole } = await supabase
          .rpc('is_super_admin', { user_id: user.id });

        if (userRole) {
          // Redirect super admins to admin dashboard
          navigate('/dashboard');
          return;
        }

        // Get user's tenant memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('user_tenant_memberships')
          .select(`
            *,
            tenants (*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (membershipError) throw membershipError;

        if (!memberships || memberships.length === 0) {
          toast({
            title: "No Access",
            description: "You are not assigned to any tenants. Please contact an administrator.",
            variant: "destructive",
          });
          return;
        }

        setUserTenants(memberships);
        setDocumentForm(prev => ({ 
          ...prev, 
          selectedTenants: memberships.map(m => m.tenant_id) 
        }));

        await fetchDocuments();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load dashboard",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch documents",
        variant: "destructive",
      });
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

      // Create document record
      const { data: documentData, error: documentError } = await supabase
        .from("documents")
        .insert({
          title: documentForm.title,
          description: documentForm.description,
          document_type: documentForm.type,
          file_url: filePath,
          author_id: user?.id
        })
        .select()
        .single();

      if (documentError) throw documentError;

      // Create tenant permissions for selected tenants
      for (const tenantId of documentForm.selectedTenants) {
        await supabase
          .from("tenant_document_permissions")
          .insert([{
            document_id: documentData.id,
            tenant_id: tenantId,
            can_view: true,
            can_download: false,
            granted_by: user?.id
          }]);
      }

      toast({ 
        title: "Success", 
        description: "Document uploaded successfully" 
      });
      
      setDocumentForm({ 
        title: "", 
        description: "", 
        type: "policy", 
        selectedTenants: userTenants.map(t => t.tenant_id) 
      });
      setSelectedFile(null);
      fetchDocuments();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const createMagicLink = async (documentId: string) => {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_magic_token');

      if (tokenError) throw tokenError;

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (userTenants.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">No Tenant Access</h1>
        <p className="text-muted-foreground mb-8">
          You are not assigned to any tenants. Please contact an administrator to get access.
        </p>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>
    );
  }

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
            <div>
              <h1 className="text-2xl font-bold">GovernanceHub Portal</h1>
              <p className="text-sm text-muted-foreground">
                {userTenants.map(t => t.tenants?.name).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{userTenants.length} tenant{userTenants.length > 1 ? 's' : ''}</span>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>
                  Documents you've uploaded and documents shared with your tenants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.title}
                          {doc.author_id === user?.id && (
                            <Badge variant="outline" className="ml-2">
                              Your upload
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.document_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc.status === "active" ? "default" : "secondary"}>
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
                              onClick={() => createMagicLink(doc.id)}
                              disabled={!doc.file_url}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredDocuments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No documents found. Upload your first document to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>
                  Upload a PDF document to share with your tenant members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      value={documentForm.title}
                      onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                      placeholder="Enter document title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type</Label>
                    <Select 
                      value={documentForm.type} 
                      onValueChange={(value) => setDocumentForm({ ...documentForm, type: value as "policy" | "standard" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={documentForm.description}
                    onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                    placeholder="Enter document description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">PDF File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only PDF files are supported. Maximum size: 50MB
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Share with Tenants</Label>
                  <div className="space-y-2">
                    {userTenants.map((membership) => (
                      <div key={membership.tenant_id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`tenant-${membership.tenant_id}`}
                          checked={documentForm.selectedTenants.includes(membership.tenant_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocumentForm({
                                ...documentForm,
                                selectedTenants: [...documentForm.selectedTenants, membership.tenant_id]
                              });
                            } else {
                              setDocumentForm({
                                ...documentForm,
                                selectedTenants: documentForm.selectedTenants.filter(id => id !== membership.tenant_id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`tenant-${membership.tenant_id}`}>
                          {membership.tenants?.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={uploadDocument} 
                  disabled={!selectedFile || !documentForm.title || documentForm.selectedTenants.length === 0}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TenantDashboard;