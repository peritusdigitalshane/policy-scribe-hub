import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Clock, Shield } from "lucide-react";

const MagicLinkViewer = () => {
  const { token } = useParams();
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndLoadDocument = async () => {
      try {
        if (!token) {
          throw new Error('Invalid magic link');
        }

        // Verify magic link access
        const { data, error } = await supabase
          .rpc('verify_magic_link_access', { token });

        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('Magic link not found or expired');
        }

        const linkData = data[0];
        
        if (!linkData.can_access) {
          throw new Error('This magic link has expired or reached its view limit');
        }

        // Increment view count
        const { data: currentLink } = await supabase
          .from('document_magic_links')
          .select('view_count')
          .eq('magic_token', token)
          .maybeSingle();

        if (currentLink) {
          await supabase
            .from('document_magic_links')
            .update({ 
              view_count: (currentLink.view_count || 0) + 1 
            })
            .eq('magic_token', token);
        }

        // Generate signed URL for the PDF
        if (linkData.document_file_url) {
          const fileName = linkData.document_file_url.split('/').pop();
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(fileName!, 3600); // 1 hour expiration

          if (urlError) throw urlError;
          setPdfUrl(signedUrlData.signedUrl);
        }

        setDocument({
          id: linkData.document_id,
          title: linkData.document_title,
          file_url: linkData.document_file_url
        });
        setCanAccess(true);

      } catch (error: any) {
        toast({
          title: "Access Denied",
          description: error.message || "Unable to access document",
          variant: "destructive",
        });
        setCanAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAndLoadDocument();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!canAccess || !document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <div>
              <h2 className="font-semibold text-lg">Access Denied</h2>
              <p className="text-muted-foreground mt-1">
                This link is invalid, expired, or has reached its view limit.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{document.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Shared document - View only
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Viewing via magic link
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Session expires in 1 hour
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Shared Document</CardTitle>
          </CardHeader>
          <CardContent>
            {pdfUrl ? (
              <div className="w-full h-[800px] border rounded-lg overflow-hidden">
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&download=0&print=0`}
                  width="100%"
                  height="100%"
                  style={{ 
                    border: 'none',
                    pointerEvents: 'none'
                  }}
                  title={document.title}
                  onContextMenu={(e) => e.preventDefault()}
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center border rounded-lg bg-muted/20">
                <div className="text-center space-y-2">
                  <div className="text-4xl">📄</div>
                  <p className="text-muted-foreground">No file available for this document</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="border-t bg-muted/30 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>This document is being shared securely. Downloading and printing are disabled.</p>
        </div>
      </div>

      {/* Enhanced security styles */}
      <style>{`
        body {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Disable text selection in iframe */
        iframe {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          pointer-events: auto;
        }
        
        /* Hide browser's built-in PDF controls */
        iframe::-webkit-media-controls,
        iframe::-webkit-media-controls-enclosure {
          display: none !important;
        }
      `}</style>

      {/* Disable keyboard shortcuts */}
      <script>{`
        document.addEventListener('keydown', function(e) {
          // Disable Ctrl+S (Save), Ctrl+P (Print), Ctrl+A (Select All), etc.
          if (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'a' || e.key === 'u')) {
            e.preventDefault();
            return false;
          }
          // Disable F12 (Developer Tools)
          if (e.key === 'F12') {
            e.preventDefault();
            return false;
          }
        });
      `}</script>
    </div>
  );
};

export default MagicLinkViewer;