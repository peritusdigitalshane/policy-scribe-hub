import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  role: "user" | "tenant_admin" | "super_admin";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, firstName, lastName, tenantId, role }: CreateUserRequest = await req.json();

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create user with admin API (auto-confirmed)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    if (!userData.user) {
      throw new Error("User creation failed - no user data returned");
    }

    console.log(`User created successfully: ${userData.user.id}`);

    // Create tenant membership if tenant selected
    if (tenantId) {
      const { error: membershipError } = await supabaseAdmin
        .from("user_tenant_memberships")
        .insert({
          user_id: userData.user.id,
          tenant_id: tenantId,
          role: role
        });

      if (membershipError) {
        console.error("Membership creation error:", membershipError);
        throw new Error(`Failed to create tenant membership: ${membershipError.message}`);
      }

      console.log(`Tenant membership created for user: ${userData.user.id}`);
    }

    // Create global role if super admin
    if (role === 'super_admin') {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userData.user.id,
          role: role
        });

      if (roleError) {
        console.error("Role creation error:", roleError);
        throw new Error(`Failed to create user role: ${roleError.message}`);
      }

      console.log(`Super admin role created for user: ${userData.user.id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userData.user.id,
          email: userData.user.email,
          confirmed: true
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);