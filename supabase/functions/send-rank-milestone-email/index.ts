import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { emailWrapper, celebrationTemplate, APP_URL } from "../_shared/email-templates.ts";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, rank, totalUsers } = await req.json();

    if (!userId || !rank) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name, email_frequency')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.email_frequency === 'none' || profile.email_frequency === 'weekly') {
      return new Response(JSON.stringify({ status: 'skipped' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const percentile = totalUsers > 0 ? Math.round((1 - rank / totalUsers) * 100) : 0;
    const subject = `🏆 You just broke into top ${rank <= 10 ? 10 : rank <= 50 ? 50 : 100}!`;

    const body = emailWrapper(subject, `Top ${percentile}% — incredible!`, celebrationTemplate(
      '🏆',
      `You're Rank #${rank}!`,
      `${profile.name}, you've climbed to <strong>rank #${rank}</strong> out of ${totalUsers} users! That puts you in the <strong>top ${percentile}%</strong>. Keep the momentum going and climb even higher.`,
      'View Leaderboard',
      `${APP_URL}/leaderboard`
    ));

    await resend.emails.send({
      from: 'LOCKD <noreply@lockd.app>',
      to: [profile.email],
      subject,
      html: body,
    });

    return new Response(JSON.stringify({ status: 'sent' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Rank milestone email error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
