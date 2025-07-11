import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Eye, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PDFViewerProps {
  document: {
    id: string;
    title: string;
    file_url: string | null;
    document_type: string;
    status: string;
    created_at: string;
  };
  canShare?: boolean;
}

const PDFViewer = ({ document, canShare = false }: PDFViewerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinks, setMagicLinks] = useState<any[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Fetch existing magic links for this document
  const fetchMagicLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('document_magic_links')
        .select('*')
        .eq('document_id', document.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMagicLinks(data || []);
    } catch (error) {
      console.error('Error fetching magic links:', error);
    }
  };

  useEffect(() => {
    if (canShare) {
      fetchMagicLinks();
    }
  }, [document.id, canShare]);

  const createMagicLink = async () => {
    setIsLoading(true);
    try {
      // Generate a magic token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_magic_token');

      if (tokenError) throw tokenError;

      // Create the magic link
      const { data, error } = await supabase
        .from('document_magic_links')
        .insert({
          document_id: document.id,
          magic_token: tokenData,
          created_by: (await supabase.auth.getUser()).data.user?.id
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

      setShowShareDialog(false);
      fetchMagicLinks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create magic link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyMagicLink = async (token: string) => {
    const magicUrl = `${window.location.origin}/view/${token}`;
    await navigator.clipboard.writeText(magicUrl);
    toast({
      title: "Copied",
      description: "Magic link copied to clipboard!",
    });
  };

  const openInNewTab = () => {
    if (document.file_url) {
      // Create a custom viewer URL that prevents downloads
      window.open(`/view-pdf/${document.id}`, '_blank');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {document.title}
              <Badge variant="outline">{document.document_type}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Created: {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              disabled={!document.file_url}
            >
              <Eye className="mr-2 h-4 w-4" />
              View PDF
            </Button>
            {canShare && (
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Share Document</DialogTitle>
                    <DialogDescription>
                      Create a magic link to share this document. Recipients can view but not download the PDF.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Active Magic Links</h4>
                      <Button onClick={createMagicLink} disabled={isLoading}>
                        Create New Link
                      </Button>
                    </div>
                    
                    {magicLinks.length > 0 ? (
                      <div className="space-y-2">
                        {magicLinks.map((link) => (
                          <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Views: {link.view_count} {link.max_views ? `/ ${link.max_views}` : '(unlimited)'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Expires: {new Date(link.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyMagicLink(link.magic_token)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/view/${link.magic_token}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No active magic links. Create one to start sharing.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      
      {document.file_url && (
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-muted/20">
            <div className="h-96 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-4xl">📄</div>
                <p className="text-muted-foreground">PDF Preview</p>
                <p className="text-sm text-muted-foreground">
                  Click "View PDF" to open in a secure viewer
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default PDFViewer;