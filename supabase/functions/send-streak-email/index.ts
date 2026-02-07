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
    const { userId, type, streakDays, groupName } = await req.json();

    if (!userId || !type) {
      return new Response(JSON.stringify({ error: 'Missing userId or type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name, email_frequency')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check email preferences
    if (profile.email_frequency === 'none') {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'opt-out' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (profile.email_frequency === 'weekly') {
      return new Response(JSON.stringify({ status: 'skipped', reason: 'weekly-only' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let subject = '';
    let body = '';

    if (type === 'milestone') {
      subject = `🎉 You hit a ${streakDays}-day streak!`;
      const milestoneNames: Record<number, string> = {
        7: 'Week Warrior 🗡️', 30: 'Month Master 💪', 100: 'Century Club 🏅', 365: 'Year Legend 👑',
      };
      const badgeName = milestoneNames[streakDays] || `${streakDays}-Day Champion`;

      body = emailWrapper(subject, `Incredible! ${streakDays} days straight!`, celebrationTemplate(
        '🎉',
        `${streakDays}-Day Streak!`,
        `Incredible consistency, ${profile.name}! You've maintained a ${streakDays}-day streak${groupName ? ` in ${groupName}` : ''}. You've earned the <strong>${badgeName}</strong> badge. Share your achievement and inspire others!`,
        'Share Achievement',
        `${APP_URL}/profile`
      ));
    } else if (type === 'broken') {
      subject = `Your ${streakDays}-day streak has ended`;
      body = emailWrapper(subject, `Don't give up — comebacks are legendary`, celebrationTemplate(
        '💔',
        `${streakDays}-Day Streak Ended`,
        `Hey ${profile.name}, your ${streakDays}-day streak${groupName ? ` in ${groupName}` : ''} has ended. But here's the thing: <strong>every champion has setbacks</strong>. The best time to start again is right now. Get back in and rebuild — your next streak could be even longer.`,
        'Start Comeback',
        `${APP_URL}/post`
      ));
    } else {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    console.error('Streak email error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
