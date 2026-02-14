export const POINTS = {
  POST_BASE: 25,
  EARLY_MORNING: 25,  // 4-7am
  LATE_NIGHT: 20,     // 9pm-12am
  MIDNIGHT: 30,       // 12am-4am
  WEEKEND: 15,        // Sat/Sun

  STREAK_MILESTONES: {
    7: 100, 14: 150, 21: 200, 30: 500, 60: 750,
    90: 1000, 100: 2500, 180: 2000, 365: 5000,
  } as Record<number, number>,

  PERFECT_WEEK: 200,
  PERFECT_MONTH: 1000,

  VOICE_REPLY_GIVEN: 3,
  REACTION_GIVEN: 1,
  REACTION_DAILY_MAX: 20,
  REACTIONS_RECEIVED_10: 10,
  REACTIONS_RECEIVED_20: 25,
  VOICE_REPLIES_RECEIVED_5: 15,
};

export const STREAK_MULTIPLIERS = [
  { min: 365, mult: 1.5 },
  { min: 100, mult: 1.3 },
  { min: 60, mult: 1.2 },
  { min: 30, mult: 1.1 },
];

export function getStreakMultiplier(streak: number): number {
  for (const { min, mult } of STREAK_MULTIPLIERS) {
    if (streak >= min) return mult;
  }
  return 1.0;
}

export interface PointBreakdown {
  base: number;
  bonuses: { key: string; label: string; points: number }[];
  multiplier: number;
  multiplierBonus: number;
  streakMilestone: number;
  perfectBonus: number;
  total: number;
}

export function calculatePostPoints(date: Date, streak: number): PointBreakdown {
  const hour = date.getHours();
  const day = date.getDay();
  const bonuses: { key: string; label: string; points: number }[] = [];

  if (hour >= 4 && hour < 7) bonuses.push({ key: 'early_morning', label: '🌅 Early Bonus', points: POINTS.EARLY_MORNING });
  if (hour >= 21) bonuses.push({ key: 'late_night', label: '🌙 Late Bonus', points: POINTS.LATE_NIGHT });
  if (hour >= 0 && hour < 4) bonuses.push({ key: 'midnight', label: '🦉 Night Owl Bonus', points: POINTS.MIDNIGHT });
  if (day === 0 || day === 6) bonuses.push({ key: 'weekend', label: '📅 Weekend Bonus', points: POINTS.WEEKEND });

  const subtotal = POINTS.POST_BASE + bonuses.reduce((s, b) => s + b.points, 0);
  const multiplier = getStreakMultiplier(streak);
  const multiplierBonus = multiplier > 1 ? Math.round(subtotal * (multiplier - 1)) : 0;

  // Streak milestone
  const streakMilestone = POINTS.STREAK_MILESTONES[streak] || 0;

  // Perfect week/month
  let perfectBonus = 0;
  if (streak > 0 && streak % 7 === 0) perfectBonus += POINTS.PERFECT_WEEK;
  if (streak === 30) perfectBonus += POINTS.PERFECT_MONTH;

  const total = subtotal + multiplierBonus + streakMilestone + perfectBonus;

  return { base: POINTS.POST_BASE, bonuses, multiplier, multiplierBonus, streakMilestone, perfectBonus, total };
}

export function calculateMomentumScore(points30d: number, streak: number): number {
  return Math.round(points30d * 0.7 + streak * 20 * 0.3);
}

// Point type labels for display
export const POINT_TYPE_LABELS: Record<string, string> = {
  post_base: '📝 Posting',
  early_morning: '🌅 Early Bonus',
  late_night: '🌙 Late Bonus',
  midnight: '🦉 Night Owl',
  weekend: '📅 Weekend',
  streak_multiplier: '🔥 Streak Multiplier',
  streak_milestone: '🏆 Streak Milestone',
  perfect_week: '⭐ Perfect Week',
  perfect_month: '🌟 Perfect Month',
  reaction_given: '👍 Reactions Given',
  voice_reply_given: '🎤 Voice Replies',
  reactions_received_10: '🎉 10+ Reactions',
  reactions_received_20: '🎉 20+ Reactions',
  voice_replies_received_5: '🎤 5+ Voice Replies',
};

// Categorize point types for profile display
export function categorizePoints(transactions: { point_type: string; points: number }[]) {
  let posting = 0, timeBonuses = 0, engagement = 0, streakBonuses = 0;

  for (const t of transactions) {
    switch (t.point_type) {
      case 'post_base':
        posting += t.points; break;
      case 'early_morning':
      case 'late_night':
      case 'midnight':
      case 'weekend':
        timeBonuses += t.points; break;
      case 'reaction_given':
      case 'voice_reply_given':
      case 'reactions_received_10':
      case 'reactions_received_20':
      case 'voice_replies_received_5':
        engagement += t.points; break;
      case 'streak_multiplier':
      case 'streak_milestone':
      case 'perfect_week':
      case 'perfect_month':
        streakBonuses += t.points; break;
      default:
        posting += t.points;
    }
  }

  const total = posting + timeBonuses + engagement + streakBonuses;
  return {
    posting, timeBonuses, engagement, streakBonuses, total,
    postingPct: total > 0 ? Math.round((posting / total) * 100) : 0,
    timeBonusesPct: total > 0 ? Math.round((timeBonuses / total) * 100) : 0,
    engagementPct: total > 0 ? Math.round((engagement / total) * 100) : 0,
    streakBonusesPct: total > 0 ? Math.round((streakBonuses / total) * 100) : 0,
  };
}
