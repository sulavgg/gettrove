import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { emailWrapper, APP_URL } from "../_shared/email-templates.ts";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== `Bearer ${anonKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find challenges that ended recently (within last 24h) and haven't had results announced
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: endedChallenges } = await supabase
      .from('weekly_challenges')
      .select('*')
      .lte('week_end', new Date().toISOString())
      .gte('week_end', yesterday.toISOString())
      .eq('results_announced', false);

    const results: Array<{ challengeId: string; emailsSent: number }> = [];

    for (const challenge of endedChallenges || []) {
      // Get all scores for this challenge
      const { data: scores } = await supabase
        .from('challenge_scores')
        .select('user_id, points')
        .eq('challenge_id', challenge.id)
        .order('points', { ascending: false });

      // Aggregate scores per user
      const userScores: Record<string, number> = {};
      for (const s of scores || []) {
        userScores[s.user_id] = (userScores[s.user_id] || 0) + s.points;
      }

      const leaderboard = Object.entries(userScores)
        .sort(([, a], [, b]) => b - a)
        .map(([uid, pts], idx) => ({ userId: uid, points: pts, rank: idx + 1 }));

      // Get top 3 names
      const top3Html: string[] = [];
      for (const entry of leaderboard.slice(0, 3)) {
        const { data: p } = await supabase.rpc('get_public_profile', { p_user_id: entry.userId });
        const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉';
        top3Html.push(`<div class="stat-row">${medal} <span class="stat-value" style="margin-left:8px;">#${entry.rank} ${p?.[0]?.name || 'Unknown'} — ${entry.points} pts</span></div>`);
      }

      // Get all group members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', challenge.group_id);

      const challengeName = challenge.challenge_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      let emailsSent = 0;

      for (const member of members || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name, email_frequency')
          .eq('user_id', member.user_id)
          .single();

        if (!profile || profile.email_frequency === 'none' || profile.email_frequency === 'weekly') continue;

        const userEntry = leaderboard.find(l => l.userId === member.user_id);
        const userRank = userEntry?.rank || leaderboard.length + 1;
        const userPoints = userEntry?.points || 0;

        const subject = `${challengeName} Results — You ranked #${userRank}`;

        const nextChallenge = challenge.next_challenge_key
          ? challenge.next_challenge_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          : 'Coming soon';

        const emailBody = `
          <div class="card" style="text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🏁</div>
            <div style="font-size:20px;font-weight:800;">${challengeName} Complete!</div>
            <div style="font-size:14px;color:#9CA3AF;margin-top:4px;">Your Rank: #${userRank} · ${userPoints} pts</div>
          </div>
          <div class="card">
            <div class="section-title">═══ TOP 3 ═══</div>
            ${top3Html.join('')}
          </div>
          <div class="card">
            <div class="section-title">═══ NEXT CHALLENGE ═══</div>
            <div style="text-align:center;font-size:16px;font-weight:600;">🚀 ${nextChallenge}</div>
            <div style="text-align:center;font-size:13px;color:#9CA3AF;margin-top:4px;">Starts Monday — be ready!</div>
          </div>
          <div class="cta-row">
            <a href="${APP_URL}" class="cta-btn">Open LOCKD</a>
          </div>`;

        const html = emailWrapper(subject, `You placed #${userRank} in ${challengeName}`, emailBody);

        try {
          await resend.emails.send({
            from: 'LOCKD <noreply@lockd.app>',
            to: [profile.email],
            subject,
            html,
          });
          emailsSent++;
        } catch (err) {
          console.error(`Failed for ${profile.email}:`, err);
        }
      }

      // Mark challenge as announced
      await supabase
        .from('weekly_challenges')
        .update({ results_announced: true })
        .eq('id', challenge.id);

      results.push({ challengeId: challenge.id, emailsSent });
    }

    return new Response(JSON.stringify({ challenges: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Challenge results email error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
