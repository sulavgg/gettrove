import type { HabitType } from '@/lib/supabase';

export interface ChallengeDefinition {
  key: string;
  name: string;
  emoji: string;
  description: string;
  rules: string;
  multiplier: number;
  verificationType: 'timestamp' | 'streak' | 'ai_photo' | 'ai_video';
  /** For timestamp-based: hour range [startHour, endHour) in 24h format */
  timeRange?: [number, number];
  /** For day-based: which days qualify (0=Sun, 6=Sat) */
  validDays?: number[];
  /** AI prompt for photo/video verification */
  aiPrompt?: string;
  /** Which habit types this challenge applies to. null = universal */
  habitType: HabitType | null;
}

// ============= Universal Challenges (all group types) =============

export const UNIVERSAL_CHALLENGES: ChallengeDefinition[] = [
  {
    key: 'early_bird',
    name: 'Early Bird Week',
    emoji: '🌅',
    description: 'Posts before 7am earn 3x points',
    rules: 'Post your check-in before 7:00 AM local time to earn triple points. Timestamp verified automatically.',
    multiplier: 3,
    verificationType: 'timestamp',
    timeRange: [0, 7],
    habitType: null,
  },
  {
    key: 'weekend_warriors',
    name: 'Weekend Warriors',
    emoji: '🏆',
    description: 'Saturday & Sunday posts earn 2x points',
    rules: 'Post on Saturday or Sunday to earn double points. Date verified automatically.',
    multiplier: 2,
    verificationType: 'timestamp',
    validDays: [0, 6], // Sunday, Saturday
    habitType: null,
  },
  {
    key: 'night_owl',
    name: 'Night Owl Week',
    emoji: '🦉',
    description: 'Posts 9pm–12am earn 2.5x points',
    rules: 'Post between 9:00 PM and midnight to earn 2.5x points. Timestamp verified automatically.',
    multiplier: 2.5,
    verificationType: 'timestamp',
    timeRange: [21, 24],
    habitType: null,
  },
  {
    key: 'perfect_week',
    name: 'Perfect Week',
    emoji: '⭐',
    description: 'Post all 7 days for a massive bonus',
    rules: 'Post every single day this week (7/7). Each post earns 1 point, and completing all 7 earns a 5x bonus on your total.',
    multiplier: 5,
    verificationType: 'streak',
    habitType: null,
  },
  {
    key: 'video_proof',
    name: 'Video Proof Week',
    emoji: '🎬',
    description: 'Video-only posts earn 1.5x points',
    rules: 'Submit a video instead of a photo to earn 1.5x points. AI verifies the submission is a video.',
    multiplier: 1.5,
    verificationType: 'ai_video',
    aiPrompt: 'Verify this is a video submission, not a static photo.',
    habitType: null,
  },
];

// ============= Habit-Specific Challenges =============

export const HABIT_CHALLENGES: ChallengeDefinition[] = [
  {
    key: 'gym_sweat_proof',
    name: 'Sweat Proof Week',
    emoji: '💦',
    description: 'Visible sweat/exertion in photo required',
    rules: 'Your gym photo must show visible signs of exertion — sweaty face, flushed skin, or mid-workout intensity. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this gym/workout photo. Does the person show visible signs of physical exertion such as sweat, flushed/red skin, heavy breathing posture, or mid-exercise intensity? Look for sweat on face/body, wet workout clothes, or strained expressions. Return true if clear signs of exertion are visible.',
    habitType: 'gym',
  },
  {
    key: 'study_books_visible',
    name: 'Books Visible Week',
    emoji: '📖',
    description: 'Study materials must be in frame',
    rules: 'Your study photo must show books, textbooks, notebooks, or study materials clearly visible in the frame. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this study/reading photo. Are there visible study materials such as books, textbooks, notebooks, printed papers, flashcards, or academic documents in the frame? The materials should be clearly identifiable as study/learning resources. Return true if study materials are clearly visible.',
    habitType: 'study',
  },
  {
    key: 'wake_up_sunrise',
    name: 'Window Sunrise Week',
    emoji: '🌄',
    description: 'Dawn/sunrise visible in background',
    rules: 'Your morning photo must show a window with dawn light or sunrise visible in the background. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this morning/wake-up photo. Is there a window visible showing early morning light, dawn, or sunrise? Look for warm golden/orange light coming through a window, a visible sky with sunrise colors, or clear evidence of very early morning natural lighting. Return true if dawn/sunrise light is visible through a window.',
    habitType: 'wake_up_early',
  },
  {
    key: 'meditate_outdoor',
    name: 'Outdoor Zen Week',
    emoji: '🌿',
    description: 'Must meditate outside (nature visible)',
    rules: 'Your meditation photo must show you outdoors with nature elements visible — trees, grass, sky, park, garden. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this meditation photo. Is the person outdoors in a natural setting? Look for visible nature elements such as trees, grass, sky, flowers, parks, gardens, bodies of water, or other natural environments. The person should appear to be in a peaceful outdoor setting. Return true if outdoor nature elements are clearly visible.',
    habitType: 'meditate',
  },
  {
    key: 'quit_replacement',
    name: 'Replacement Week',
    emoji: '🔄',
    description: 'Show healthy replacement activity',
    rules: 'Your photo must show a healthy replacement activity — exercise, healthy snack, hobby, or positive coping mechanism. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this photo for someone quitting a bad habit. Does the photo show a healthy replacement activity such as exercise, drinking water/tea, eating healthy food, practicing a hobby, reading, going for a walk, or any positive coping mechanism? Return true if a clearly healthy/positive activity is shown.',
    habitType: 'quit_bad_habit',
  },
  {
    key: 'journal_handwritten',
    name: 'Handwritten Week',
    emoji: '✒️',
    description: 'Handwritten pages visible',
    rules: 'Your journal photo must show handwritten text on paper — notebook, journal, diary with actual handwriting visible. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this journaling photo. Is there visible handwriting on paper? Look for a notebook, journal, or diary with actual handwritten text (not typed/printed). The handwriting should be clearly identifiable as manually written content. Return true if handwritten text on paper is clearly visible.',
    habitType: 'journal',
  },
  {
    key: 'creative_wip',
    name: 'WIP Week',
    emoji: '🛠️',
    description: 'Show process/tools, not just finished work',
    rules: 'Your creative photo must show work-in-progress — tools, materials, rough drafts, messy workspace, or the creation process. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this creative work photo. Does it show a work-in-progress rather than a polished finished product? Look for visible tools (brushes, instruments, software with editing interface), raw materials, rough drafts, sketches, messy workspaces, or evidence of the creative process happening. Return true if the creation process/tools are visible rather than just a finished piece.',
    habitType: 'creative',
  },
  {
    key: 'cardio_distance',
    name: 'Distance Week',
    emoji: '📊',
    description: 'Running app stats visible in photo',
    rules: 'Your cardio photo must show distance/running app stats — phone screen or watch displaying distance, pace, or route. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this cardio/running photo. Are there visible fitness app statistics on a phone screen or smartwatch? Look for displayed distance, pace, time, route maps, heart rate, calories, or other running/cardio metrics from apps like Strava, Nike Run Club, Apple Fitness, etc. Return true if fitness tracking stats are clearly visible.',
    habitType: 'cardio',
  },
  {
    key: 'water_gallon',
    name: 'Gallon Jug Week',
    emoji: '🫗',
    description: 'Gallon jug must be in photo',
    rules: 'Your hydration photo must include a large water jug/gallon bottle clearly visible in the frame. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this hydration/water drinking photo. Is there a large water container visible — such as a gallon jug, large water bottle (1L+), water pitcher, or big refillable container? The container should be prominently visible and clearly identifiable as a large water vessel. Return true if a large water container is clearly visible.',
    habitType: 'drink_water',
  },
  {
    key: 'eating_ingredients',
    name: 'Ingredients Week',
    emoji: '🥬',
    description: 'Raw ingredients visible (cooking from scratch)',
    rules: 'Your healthy eating photo must show raw/fresh ingredients — vegetables, fruits, uncooked items visible, showing you cook from scratch. AI verified.',
    multiplier: 2,
    verificationType: 'ai_photo',
    aiPrompt: 'Analyze this healthy eating photo. Are there visible raw or fresh ingredients such as uncooked vegetables, fresh fruits, raw proteins, fresh herbs, or other unprocessed food items? The photo should suggest cooking from scratch rather than showing only a finished plated meal or takeout. Return true if raw/fresh cooking ingredients are clearly visible.',
    habitType: 'healthy_eating',
  },
];

// ============= Combined Map =============

export const ALL_CHALLENGES: ChallengeDefinition[] = [...UNIVERSAL_CHALLENGES, ...HABIT_CHALLENGES];

export const CHALLENGE_MAP: Record<string, ChallengeDefinition> = Object.fromEntries(
  ALL_CHALLENGES.map((c) => [c.key, c])
);

/**
 * Get challenges available for a specific habit type.
 * Returns all universal challenges + the habit-specific one.
 */
export const getChallengesForHabit = (habitType: HabitType): ChallengeDefinition[] => {
  return [
    ...UNIVERSAL_CHALLENGES,
    ...HABIT_CHALLENGES.filter((c) => c.habitType === habitType),
  ];
};

/**
 * Check if a post qualifies for a timestamp-based challenge.
 */
export const checkTimestampChallenge = (
  challenge: ChallengeDefinition,
  postTime: Date
): boolean => {
  if (challenge.verificationType !== 'timestamp') return false;

  // Check time range
  if (challenge.timeRange) {
    const hour = postTime.getHours();
    if (hour < challenge.timeRange[0] || hour >= challenge.timeRange[1]) {
      return false;
    }
  }

  // Check valid days
  if (challenge.validDays) {
    const day = postTime.getDay();
    if (!challenge.validDays.includes(day)) {
      return false;
    }
  }

  return true;
};
