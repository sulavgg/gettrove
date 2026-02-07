import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { emailWrapper, APP_URL } from "../_shared/email-templates.ts";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function buildWeeklyRecapEmail(profile: { name: string }, recap: any): string {
  const consistency = recap.user_consistency || 0;
  const daysPosted = recap.days_posted || 0;
  const currentStreak = recap.current_streak || 0;
  const streakChange = recap.streak_change || 0;
  const streakArrow = streakChange > 0 ? `↑ +${streakChange}` : streakChange < 0 ? `↓ ${streakChange}` : '—';
  const groupRank = recap.group_rank;
  const groupTotal = recap.group_total;

  const body = `
    <div class="card">
      <div class="section-title">═══ YOUR WEEK IN REVIEW ═══</div>
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:48px;margin-bottom:8px;">${daysPosted >= 6 ? '🔥' : daysPosted >= 4 ? '💪' : '📊'}</div>
        <div style="font-size:20px;font-weight:800;">${daysPosted}/7 Days Posted</div>
        <div style="font-size:14px;color:#9CA3AF;">${consistency}% consistency</div>
      </div>
      <hr class="divider" />
      <div class="stat-row">🔥 <span class="stat-value" style="margin-left:8px;">Current Streak: ${currentStreak} days (${streakArrow})</span></div>
      ${recap.most_productive_day ? `<div class="stat-row">📅 <span class="stat-value" style="margin-left:8px;">Most Productive: ${recap.most_productive_day}</span></div>` : ''}
      ${recap.avg_post_time ? `<div class="stat-row">⏰ <span class="stat-value" style="margin-left:8px;">Avg Post Time: ${recap.avg_post_time}</span></div>` : ''}
      ${groupRank ? `<div class="stat-row">📊 <span class="stat-value" style="margin-left:8px;">Group Rank: #${groupRank} of ${groupTotal || '?'}</span></div>` : ''}
    </div>

    ${recap.best_performer_name ? `
    <div class="card">
      <div class="section-title">═══ GROUP HIGHLIGHTS ═══</div>
      <div class="stat-row">👑 <span class="stat-value" style="margin-left:8px;">MVP: ${recap.best_performer_name} (${recap.best_performer_days} days)</span></div>
      ${recap.struggling_member_name ? `<div class="stat-row">💪 <span style="color:#9CA3AF;margin-left:8px;">${recap.struggling_member_name} needs support (${recap.struggling_member_days} days)</span></div>` : ''}
    </div>` : ''}

    ${recap.next_milestone_name ? `
    <div class="card" style="text-align:center;">
      <div style="font-size:14px;color:#9CA3AF;">Next Milestone</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px;">${recap.next_milestone_name}</div>
      <div style="font-size:13px;color:#A78BFA;">${recap.next_milestone_days} days away</div>
    </div>` : ''}

    <div class="cta-row">
      <a href="${APP_URL}/profile" class="cta-btn">View Full Recap</a>
    </div>`;

  return emailWrapper(
    'Your Week in Review',
    `${daysPosted} days posted, ${currentStreak}-day streak`,
    body
  );
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== `Bearer ${anonKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the most recent week's recaps
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setDate(weekStart.getDate() - 7); // Last Sunday
    weekStart.setHours(0, 0, 0, 0);

    const { data: recaps } = await supabase
      .from('weekly_recaps')
      .select('*')
      .gte('week_start', weekStart.toISOString().split('T')[0]);

    const results: Array<{ userId: string; status: string }> = [];

    for (const recap of recaps || []) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name, email_frequency')
          .eq('user_id', recap.user_id)
          .single();

        if (!profile || profile.email_frequency === 'none') {
          results.push({ userId: recap.user_id, status: 'skipped' });
          continue;
        }
        // critical-only users don't get weekly recap
        if (profile.email_frequency === 'critical') {
          results.push({ userId: recap.user_id, status: 'skipped' });
          continue;
        }

        const subject = `Your week in review — ${recap.days_posted}/7 days posted`;
        const html = buildWeeklyRecapEmail(profile, recap);

        await resend.emails.send({
          from: 'LOCKD <noreply@lockd.app>',
          to: [profile.email],
          subject,
          html,
        });

        results.push({ userId: recap.user_id, status: 'sent' });
      } catch (err) {
        console.error(`Failed for user ${recap.user_id}:`, err);
        results.push({ userId: recap.user_id, status: 'error' });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.status === 'sent').length, total: results.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Weekly recap email error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
