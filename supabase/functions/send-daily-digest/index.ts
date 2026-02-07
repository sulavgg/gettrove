import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import {
  emailWrapper, statusSection, rankSection, pointsSection,
  challengeSection, groupsSection, happeningSection, ctaButtons, APP_URL
} from "../_shared/email-templates.ts";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

interface UserDigestData {
  userId: string;
  email: string;
  name: string;
  postedToday: boolean;
  currentStreak: number;
  rank: number;
  totalUsers: number;
  rankChange: number;
  pointsToday: number;
  pointsWeek: number;
  weeklyRank: number | null;
  groups: Array<{ emoji: string; name: string; updates: string[] }>;
  challenge: { name: string; progress: string; gap: string; daysLeft: number } | null;
  happenings: string[];
}

async function buildDigestForUser(userId: string): Promise<UserDigestData | null> {
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, email, name, email_frequency')
    .eq('user_id', userId)
    .single();

  if (!profile) return null;
  
  // Check frequency preference — skip if none or weekly-only
  if (profile.email_frequency === 'none' || profile.email_frequency === 'weekly') return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Check if posted today (across any group)
  const { data: todayCheckins } = await supabase
    .from('checkins')
    .select('id, group_id, created_at')
    .eq('user_id', userId)
    .gte('created_at', todayISO);

  const postedToday = (todayCheckins?.length || 0) > 0;

  // Get streaks
  const { data: streaks } = await supabase
    .from('streaks')
    .select('current_streak, group_id')
    .eq('user_id', userId);

  const bestStreak = Math.max(...(streaks?.map(s => s.current_streak) || [0]));

  // Get user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  const groupIds = memberships?.map(m => m.group_id) || [];

  // Get group details
  const groups: UserDigestData['groups'] = [];
  for (const gid of groupIds.slice(0, 5)) {
    const { data: grp } = await supabase.from('groups').select('name, habit_type').eq('id', gid).single();
    if (!grp) continue;

    const habitEmoji: Record<string, string> = {
      gym: '💪', study: '📚', wake_up_early: '⏰', meditate: '🧘',
      quit_bad_habit: '🚫', journal: '✍️', creative: '🎨', cardio: '🏃',
      drink_water: '💧', healthy_eating: '🥗', other: '🎯',
    };

    // Count today's posts in the group
    const { count: groupPostsToday } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', gid)
      .gte('created_at', todayISO);

    const updates: string[] = [];
    if (groupPostsToday && groupPostsToday > 0) {
      updates.push(`${groupPostsToday} new post${groupPostsToday > 1 ? 's' : ''} today`);
    }

    // Check for recent streak milestones in the group
    const { data: milestoneStreaks } = await supabase
      .from('streaks')
      .select('user_id, current_streak')
      .eq('group_id', gid)
      .in('current_streak', [7, 30, 100, 365]);

    for (const ms of milestoneStreaks || []) {
      if (ms.user_id !== userId) {
        const { data: msProfile } = await supabase.rpc('get_public_profile', { p_user_id: ms.user_id });
        if (msProfile?.[0]) {
          updates.push(`${msProfile[0].name} hit ${ms.current_streak}-day streak 🎉`);
        }
      }
    }

    groups.push({
      emoji: habitEmoji[grp.habit_type] || '🎯',
      name: grp.name,
      updates: updates.length > 0 ? updates : ['No new activity today'],
    });
  }

  // Get challenge data
  let challenge: UserDigestData['challenge'] = null;
  if (groupIds.length > 0) {
    const now = new Date().toISOString();
    const { data: activeChallenge } = await supabase
      .from('weekly_challenges')
      .select('*')
      .in('group_id', groupIds)
      .lte('week_start', now)
      .gte('week_end', now)
      .limit(1)
      .maybeSingle();

    if (activeChallenge) {
      const weekEnd = new Date(activeChallenge.week_end);
      const daysLeft = Math.max(0, Math.ceil((weekEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      
      const { data: userScores } = await supabase
        .from('challenge_scores')
        .select('points')
        .eq('challenge_id', activeChallenge.id)
        .eq('user_id', userId);

      const totalPoints = userScores?.reduce((s, sc) => s + sc.points, 0) || 0;

      challenge = {
        name: activeChallenge.challenge_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        progress: `Your Progress: ${totalPoints} points earned`,
        gap: `Keep pushing for a top placement!`,
        daysLeft,
      };
    }
  }

  // Build rank (simplified: count all users with higher total_checkins)
  const { data: allStreaks } = await supabase
    .from('streaks')
    .select('user_id, total_checkins')
    .order('total_checkins', { ascending: false });

  const userTotals: Record<string, number> = {};
  for (const s of allStreaks || []) {
    userTotals[s.user_id] = (userTotals[s.user_id] || 0) + s.total_checkins;
  }
  const sorted = Object.entries(userTotals).sort(([, a], [, b]) => b - a);
  const rank = sorted.findIndex(([id]) => id === userId) + 1;
  const totalUsers = sorted.length;

  // Happenings
  const happenings: string[] = [];
  for (const s of allStreaks || []) {
    if (s.user_id !== userId && [100, 365].includes(s.total_checkins)) {
      const { data: p } = await supabase.rpc('get_public_profile', { p_user_id: s.user_id });
      if (p?.[0]) happenings.push(`🔥 ${p[0].name} just hit ${s.total_checkins} total check-ins`);
    }
    if (happenings.length >= 3) break;
  }

  // Points today
  const { data: todayScores } = await supabase
    .from('challenge_scores')
    .select('points')
    .eq('user_id', userId)
    .gte('created_at', todayISO);

  const pointsToday = todayScores?.reduce((s, sc) => s + sc.points, 0) || 0;

  // Points this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const { data: weekScores } = await supabase
    .from('challenge_scores')
    .select('points')
    .eq('user_id', userId)
    .gte('created_at', weekStart.toISOString());

  const pointsWeek = weekScores?.reduce((s, sc) => s + sc.points, 0) || 0;

  return {
    userId,
    email: profile.email,
    name: profile.name,
    postedToday,
    currentStreak: bestStreak,
    rank: rank || 1,
    totalUsers: totalUsers || 1,
    rankChange: 0,
    pointsToday,
    pointsWeek,
    weeklyRank: null,
    groups,
    challenge,
    happenings,
  };
}

function buildSubjectLine(data: UserDigestData): string {
  if (!data.postedToday && data.currentStreak > 0) {
    return `⚠️ ${Math.max(1, 6)} hours to save your ${data.currentStreak}-day streak`;
  }
  if (data.currentStreak > 0) {
    return `LOCKD Daily - Rank #${data.rank} 🔥 ${data.currentStreak}-day streak`;
  }
  return `LOCKD Daily - Your status update`;
}

function buildEmailBody(data: UserDigestData): string {
  const hoursLeft = Math.max(1, 24 - new Date().getHours());

  let body = `
    <div class="card">
      <div class="section-title">═══ YOUR STATUS ═══</div>
      ${statusSection(data.postedToday, data.currentStreak, hoursLeft)}
      ${rankSection(data.rank, data.totalUsers, data.rankChange)}
      ${pointsSection(data.pointsToday, data.pointsWeek, data.weeklyRank)}
    </div>`;

  if (data.challenge) {
    body += challengeSection(
      data.challenge.name,
      data.challenge.progress,
      data.challenge.gap,
      data.challenge.daysLeft
    );
  }

  body += groupsSection(data.groups);
  body += happeningSection(data.happenings);
  body += ctaButtons();

  return emailWrapper(
    'LOCKD Daily Digest',
    data.postedToday
      ? `✅ Streak safe at ${data.currentStreak} days`
      : `⚠️ Don't lose your ${data.currentStreak}-day streak`,
    body
  );
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    // Allow cron calls or service role calls
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (authHeader !== `Bearer ${anonKey}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get all users with email preferences that include daily
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .in('email_frequency', ['all', 'daily', 'critical']);

    const results: Array<{ userId: string; status: string }> = [];

    for (const p of profiles || []) {
      try {
        const data = await buildDigestForUser(p.user_id);
        if (!data) {
          results.push({ userId: p.user_id, status: 'skipped' });
          continue;
        }

        const subject = buildSubjectLine(data);
        const html = buildEmailBody(data);

        await resend.emails.send({
          from: 'LOCKD <noreply@lockd.app>',
          to: [data.email],
          subject,
          html,
        });

        results.push({ userId: p.user_id, status: 'sent' });
      } catch (err) {
        console.error(`Failed for user ${p.user_id}:`, err);
        results.push({ userId: p.user_id, status: 'error' });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.status === 'sent').length, total: results.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Daily digest error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
