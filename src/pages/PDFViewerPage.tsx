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

  // Enhanced security - prevent all download/save attempts
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
          description: "Download and print functions are disabled for document security",
          variant: "destructive",
        });
      }
      
      // Prevent F12, inspect element shortcuts
      if (event.key === 'F12' || 
          (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'C' || event.key === 'J')) ||
          (event.ctrlKey && event.key === 'U')) {
        event.preventDefault();
        event.stopPropagation();
        toast({
          title: "Action Disabled", 
          description: "Developer tools are disabled for document security",
          variant: "destructive",
        });
      }
    };

    const handleRightClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      toast({
        title: "Action Disabled",
        description: "Right-click is disabled for document security",
        variant: "destructive",
      });
      return false;
    };

    const handleDragStart = (event: DragEvent) => {
      event.preventDefault();
      return false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('dragstart', handleDragStart);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  useEffect(() => {
    const fetchDocument = async () => {
      console.log('Starting document fetch for ID:', documentId);
      
      try {
        // First check if we have an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Authentication Error",
            description: "Please log in again",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        if (!session?.user) {
          console.log('No active session found, redirecting to auth');
          toast({
            title: "Not Authenticated", 
            description: "Please log in to view documents",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        console.log('User authenticated:', session.user.id);
        console.log('Fetching document with ID:', documentId);

        // Check if user has access to this document
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (error) {
          console.error('Error fetching document:', error);
          if (error.code === 'PGRST116') {
            toast({
              title: "Document Not Found",
              description: "The requested document does not exist or you don't have access to it",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Database Error",
              description: error.message,
              variant: "destructive",
            });
          }
          navigate('/dashboard');
          return;
        }

        console.log('Document fetched successfully:', data);
        setDocument(data);

        // Generate PDF URL if file exists
        if (data.file_url) {
          console.log('Document has file_url:', data.file_url);
          
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(data.file_url);

          console.log('Generated public URL:', publicUrlData.publicUrl);
          
          // Test if the file is accessible
          try {
            const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
            console.log('File accessibility test:', response.status, response.statusText);
            
            if (response.ok) {
              setPdfUrl(publicUrlData.publicUrl);
              console.log('PDF URL set successfully');
            } else {
              console.error('PDF file not accessible:', response.status);
              toast({
                title: "File Not Found",
                description: `PDF file is not accessible (Error: ${response.status})`,
                variant: "destructive",
              });
            }
          } catch (fetchError) {
            console.error('Error testing file access:', fetchError);
            // Still set the URL in case it's a CORS issue
            setPdfUrl(publicUrlData.publicUrl);
            console.log('Set PDF URL despite access test failure (might be CORS)');
          }
        } else {
          console.log('Document has no file_url');
          toast({
            title: "No File",
            description: "This document doesn't have an associated PDF file",
            variant: "destructive",
          });
        }

      } catch (error: any) {
        console.error('Unexpected error in fetchDocument:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load document",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
        console.log('Fetch document completed, loading set to false');
      }
    };

    if (documentId) {
      console.log('Document ID provided:', documentId);
      fetchDocument();
    } else {
      console.error('No document ID provided');
      toast({
        title: "Invalid URL",
        description: "No document ID specified",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [documentId, navigate]);

  if (isLoading) {
    console.log('Component is in loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading document...</p>
          <p className="text-xs text-muted-foreground">Document ID: {documentId}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    console.log('No document found, showing not found message');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Document not found</p>
            <p className="text-xs text-muted-foreground mt-2">Document ID: {documentId}</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('Rendering PDF viewer. Document:', document?.title, 'PDF URL:', pdfUrl);

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
              <div className="w-full h-[800px] border rounded-lg overflow-hidden relative bg-gray-50">
                {/* Debug info - remove in production */}
                <div className="bg-muted p-2 text-xs font-mono border-b">
                  Debug: PDF loaded successfully
                </div>
                
                {/* Secure iframe with download prevention */}
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit&pagemode=none&view=FitH`}
                  width="100%"
                  height="90%"
                  style={{ 
                    border: 'none',
                    pointerEvents: 'auto',
                    userSelect: 'none'
                  }}
                  title={document.title}
                  sandbox="allow-same-origin allow-scripts"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast({
                      title: "Action Disabled",
                      description: "Right-click is disabled for document security",
                      variant: "destructive",
                    });
                    return false;
                  }}
                  onLoad={(e) => {
                    console.log('PDF loaded successfully');
                  }}
                  onError={(e) => {
                    console.error('PDF loading error');
                    toast({
                      title: "Error",
                      description: "Failed to load PDF document",
                      variant: "destructive",
                    });
                  }}
                />
                
                {/* Security overlay to prevent bypass attempts */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ 
                    zIndex: 1,
                    background: 'transparent',
                    userSelect: 'none'
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    return false;
                  }}
                />
                
                {/* Security warning */}
                <div className="absolute bottom-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded border">
                  🔒 View Only - Download Disabled
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center border rounded-lg bg-muted/20">
                <div className="text-center space-y-2">
                  <div className="text-4xl">📄</div>
                  <p className="text-muted-foreground">No file available for this document</p>
                  <p className="text-xs text-muted-foreground">
                    File URL: {document?.file_url || 'None'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced security styling */}
      <style>{`
        /* Disable all text selection globally */
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
        }
        
        /* Hide print and download buttons in PDF viewer */
        iframe {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          pointer-events: auto !important;
        }
        
        /* Disable image saving */
        img {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
          pointer-events: none !important;
        }
        
        /* Disable context menu completely */
        body {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -khtml-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        
        /* Hide scrollbars to prevent drag interactions */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          -webkit-user-select: none !important;
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        /* Disable PDF.js download button if it appears */
        button[title="Download"],
        button[title="Print"],
        .download,
        .print {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Override any PDF viewer controls */
        [data-l10n-id="download"],
        [data-l10n-id="print"],
        [data-l10n-id="save"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default PDFViewerPage;