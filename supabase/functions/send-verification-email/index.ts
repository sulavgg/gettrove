import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const { email, redirectTo } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Generate a magic link to confirm the user's email
    // The user already exists from signUp, so magiclink type works and confirms email on click
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        type: "magiclink",
        email,
        options: {
          redirect_to: redirectTo || SUPABASE_URL,
        },
      }),
    });

    const linkData = await linkRes.json();

    if (!linkRes.ok) {
      console.error("Generate link error:", linkData);
      throw new Error(linkData.msg || "Failed to generate verification link");
    }

    // Extract the verification URL from the response
    const actionLink = linkData.action_link;
    if (!actionLink) {
      console.error("No action_link in response:", linkData);
      throw new Error("Could not generate verification link");
    }

    const userName = linkData.email?.split("@")[0] || email.split("@")[0];

    // Send branded email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trove <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Trove — Verify Your Email",
        html: buildVerificationEmail(userName, actionLink),
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(`Email send failed: ${JSON.stringify(emailData)}`);
    }

    console.log("Verification email sent via Resend:", emailData.id, "to:", email);

    return new Response(
      JSON.stringify({ success: true, messageId: emailData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

function buildVerificationEmail(name: string, confirmUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="background:#0A1628;border-radius:16px;padding:40px 32px;text-align:center;">
      <h1 style="color:#D4AF37;font-size:28px;font-weight:800;letter-spacing:2px;margin:0 0 8px;">TROVE</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;">Build Your Treasure</p>
      
      <div style="background:#111d33;border-radius:12px;padding:28px 24px;margin-bottom:28px;">
        <p style="color:#ffffff;font-size:18px;font-weight:600;margin:0 0 12px;">Welcome, ${name}!</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
          Verify your email to start building your streak and earning points. Consistency is currency.
        </p>
      </div>
      
      <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#F4D03F);color:#0A1628;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.5px;">
        Verify Email Address
      </a>
      
      <p style="color:#64748b;font-size:12px;margin:28px 0 0;line-height:1.5;">
        If you didn't create a Trove account, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(handler);
