import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Calendar, FileType, Tag } from "lucide-react";

const PDFViewerPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Add global keyboard shortcut prevention
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent common download/save shortcuts
      if ((event.ctrlKey || event.metaKey) && 
          (event.key === 's' || event.key === 'p' || event.key === 'a' || 
           event.key === 'S' || event.key === 'P' || event.key === 'A')) {
        event.preventDefault();
        event.stopPropagation();
        toast({
          title: "Action Disabled",
          description: "Download and print functions are disabled for this document",
          variant: "destructive",
        });
      }
      
      // Prevent F12, right-click menu shortcuts
      if (event.key === 'F12' || 
          (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'C' || event.key === 'J')) ||
          (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        // First check if we have an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/auth');
          return;
        }

        if (!session?.user) {
          console.log('No active session found, redirecting to auth');
          navigate('/auth');
          return;
        }

        console.log('User authenticated, fetching document:', documentId);

        // Check if user has access to this document
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (error) {
          console.error('Error fetching document:', error);
          throw error;
        }

        // Get public URL for the PDF since bucket is now public
        if (data.file_url) {
          console.log('Document file_url:', data.file_url);
          
          // Try public URL first
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(data.file_url);

          console.log('Generated public URL:', publicUrlData.publicUrl);
          
          // Verify the file exists by trying to fetch it
          try {
            const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
            if (response.ok) {
              setPdfUrl(publicUrlData.publicUrl);
              console.log('PDF URL verified and set successfully');
            } else {
              console.error('PDF file not accessible:', response.status, response.statusText);
              toast({
                title: "Error",
                description: `PDF file not accessible (${response.status})`,
                variant: "destructive",
              });
            }
          } catch (fetchError) {
            console.error('Error verifying PDF access:', fetchError);
            // Still try to set the URL - the error might be CORS related
            setPdfUrl(publicUrlData.publicUrl);
          }
        }

        setDocument(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load document",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Document not found</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
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
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{document.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Secure viewing mode - Download disabled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Protected Content
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Document Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileType className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Type:</span>
                <span>{document.document_type ? document.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Category:</span>
                <span>{document.category || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Last Reviewed:</span>
                <span>{document.last_reviewed ? new Date(document.last_reviewed).toLocaleDateString() : 'Not reviewed'}</span>
              </div>
            </div>
            {document.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">{document.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            {pdfUrl ? (
              <div className="w-full h-[800px] border rounded-lg overflow-hidden relative">
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit&pagemode=none&view=FitH&disableprint=true`}
                  width="100%"
                  height="100%"
                  style={{ 
                    border: 'none',
                    pointerEvents: 'auto'
                  }}
                  title={document.title}
                  onContextMenu={(e) => e.preventDefault()}
                  onLoad={(e) => {
                    // Disable additional shortcuts when iframe loads
                    const iframe = e.target as HTMLIFrameElement;
                    try {
                      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                      if (iframeDoc) {
                        iframeDoc.addEventListener('keydown', (event) => {
                          // Prevent common download shortcuts
                          if ((event.ctrlKey || event.metaKey) && 
                              (event.key === 's' || event.key === 'p' || event.key === 'a')) {
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        });
                      }
                    } catch (error) {
                      // Cross-origin restrictions may prevent access
                      console.log('Cannot access iframe content due to CORS');
                    }
                  }}
                />
                {/* Overlay to prevent some bypass attempts */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 1 }}
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

      {/* Enhanced security styling */}
      <style>{`
        body {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Disable text selection and drag operations */
        * {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
        
        /* Enhanced iframe security */
        iframe {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          pointer-events: auto;
        }
        
        /* Disable image drag/save */
        img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
        
        /* Hide context menu completely */
        ::-webkit-scrollbar-track {
          -webkit-user-select: none;
        }
      `}</style>
    </div>
  );
};

export default PDFViewerPage;