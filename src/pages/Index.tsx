import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  FileText, 
  Shield, 
  Users, 
  Building2, 
  ArrowRight, 
  CheckCircle, 
  BookOpen,
  Globe
} from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        // Check if user is super admin
        const { data: isSuperAdmin } = await supabase
          .rpc('is_super_admin', { user_id: session.user.id });
        
        if (isSuperAdmin) {
          navigate("/dashboard");
        } else {
          navigate("/tenant-dashboard");
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        // Check if user is super admin
        const { data: isSuperAdmin } = await supabase
          .rpc('is_super_admin', { user_id: session.user.id });
        
        if (isSuperAdmin) {
          navigate("/dashboard");
        } else {
          navigate("/tenant-dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const features = [
    {
      icon: <Shield className="h-6 w-6 text-blue-500" />,
      title: "Policy Management",
      description: "Centralized management of organizational policies with version control and approval workflows."
    },
    {
      icon: <BookOpen className="h-6 w-6 text-green-500" />,
      title: "Standards Registry",
      description: "Comprehensive standards documentation with categorization and easy access controls."
    },
    {
      icon: <Building2 className="h-6 w-6 text-purple-500" />,
      title: "Multi-Tenant Architecture",
      description: "Secure isolation between different organizations with granular permission controls."
    },
    {
      icon: <Users className="h-6 w-6 text-orange-500" />,
      title: "Role-Based Access",
      description: "Flexible user roles from super admin to tenant users with customizable permissions."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3">
            <FileText className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              GovernanceHub
            </h1>
          </div>
          
          <h2 className="text-3xl font-semibold text-foreground">
            A Peritus Digital Platform
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your organization's governance, policy and standards management with our secure, 
            multi-tenant platform designed for enterprise compliance and operational excellence.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Secure & Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>Cloud-Based</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Multi-Tenant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h3 className="text-3xl font-bold">Platform Features</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage policies and standards across your organization
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Role Types Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h3 className="text-3xl font-bold">User Roles</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Designed for different organizational roles and responsibilities
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-blue-500" />
                <CardTitle className="text-lg">Admin Plan</CardTitle>
              </div>
              <Badge variant="secondary" className="w-fit">Full Control</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Manage organization users</li>
                <li>• Create and edit documents</li>
                <li>• Control document permissions</li>
                <li>• Advanced reporting & analytics</li>
                <li>• Bulk document operations</li>
                <li>• Custom approval workflows</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-green-500" />
                <CardTitle className="text-lg">Standard Plan</CardTitle>
              </div>
              <Badge variant="outline" className="w-fit">Essential Access</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Access assigned documents</li>
                <li>• View policies and standards</li>
                <li>• Download permitted files</li>
                <li>• Basic search and filtering</li>
                <li>• Mobile app access</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto text-center bg-gradient-to-r from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription>
              Join organizations already using GovernanceHub to streamline their compliance management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Create Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
