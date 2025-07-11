import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings as SettingsIcon, Shield, Link, FileText, Database } from "lucide-react";

interface Setting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [settings, setSettings] = useState<Setting[]>([]);

  // Form state
  const [magicLinkExpiryDays, setMagicLinkExpiryDays] = useState(30);
  const [magicLinkMaxViews, setMagicLinkMaxViews] = useState<number | null>(null);
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(true);
  const [pdfSecurityLevel, setPdfSecurityLevel] = useState("high");
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(50);

  useEffect(() => {
    const checkAuthAndLoadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Check if user is super admin
        const { data: isSuperAdmin, error } = await supabase
          .rpc('is_super_admin', { user_id: user.id });

        if (error) throw error;

        if (!isSuperAdmin) {
          toast({
            title: "Access Denied",
            description: "Only super administrators can access settings",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setIsAuthorized(true);
        await loadSettings();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to verify permissions",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadSettings();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;

      setSettings(data || []);

      // Populate form with current settings
      data?.forEach((setting) => {
        const value = setting.setting_value;
        
        switch (setting.setting_key) {
          case 'magic_link_default_expiry_days':
            setMagicLinkExpiryDays(typeof value === 'number' ? value : parseInt(String(value)));
            break;
          case 'magic_link_max_views_default':
            setMagicLinkMaxViews(value === null ? null : (typeof value === 'number' ? value : parseInt(String(value))));
            break;
          case 'magic_link_enabled':
            setMagicLinkEnabled(Boolean(value));
            break;
          case 'pdf_viewer_security_level':
            setPdfSecurityLevel(String(value));
            break;
          case 'max_file_size_mb':
            setMaxFileSizeMb(typeof value === 'number' ? value : parseInt(String(value)));
            break;
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load settings",
        variant: "destructive",
      });
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: value,
          updated_by: user?.id 
        })
        .eq('setting_key', key);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Update all settings
      await updateSetting('magic_link_default_expiry_days', magicLinkExpiryDays);
      await updateSetting('magic_link_max_views_default', magicLinkMaxViews);
      await updateSetting('magic_link_enabled', magicLinkEnabled);
      await updateSetting('pdf_viewer_security_level', pdfSecurityLevel);
      await updateSetting('max_file_size_mb', maxFileSizeMb);

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });

      await loadSettings(); // Reload to show updated values
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              <h1 className="text-2xl font-semibold">System Settings</h1>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Super Admin Only
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* Magic Link Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Magic Link Settings
              </CardTitle>
              <CardDescription>
                Configure default settings for document magic links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Enable Magic Links</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to create shareable magic links for documents
                  </p>
                </div>
                <Switch
                  checked={magicLinkEnabled}
                  onCheckedChange={setMagicLinkEnabled}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="expiry-days">Default Expiry (Days)</Label>
                  <Input
                    id="expiry-days"
                    type="number"
                    min="1"
                    max="365"
                    value={magicLinkExpiryDays}
                    onChange={(e) => setMagicLinkExpiryDays(parseInt(e.target.value) || 30)}
                    disabled={!magicLinkEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    How long magic links remain valid (1-365 days)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-views">Default Max Views</Label>
                  <Input
                    id="max-views"
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={magicLinkMaxViews || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMagicLinkMaxViews(val === '' ? null : parseInt(val) || null);
                    }}
                    disabled={!magicLinkEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum views per link (empty = unlimited)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF Security Settings
              </CardTitle>
              <CardDescription>
                Configure security level and restrictions for PDF viewing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="security-level">PDF Viewer Security Level</Label>
                <Select value={pdfSecurityLevel} onValueChange={setPdfSecurityLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Basic restrictions</SelectItem>
                    <SelectItem value="medium">Medium - Standard protection</SelectItem>
                    <SelectItem value="high">High - Maximum security</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher levels add more restrictions to prevent downloading and copying
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
                <Input
                  id="max-file-size"
                  type="number"
                  min="1"
                  max="500"
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(parseInt(e.target.value) || 50)}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum file size for PDF uploads (1-500 MB)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Statistics
              </CardTitle>
              <CardDescription>
                Current system usage and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">
                    {settings.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Settings</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">PDF</p>
                  <p className="text-sm text-muted-foreground">File Types</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">
                    {magicLinkEnabled ? 'ON' : 'OFF'}
                  </p>
                  <p className="text-sm text-muted-foreground">Magic Links</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">
                    {pdfSecurityLevel.toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">Security</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={isSaving}
              size="lg"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;