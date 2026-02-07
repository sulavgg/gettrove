import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// All challenge keys grouped by type
const UNIVERSAL_KEYS = ['early_bird', 'weekend_warriors', 'night_owl', 'perfect_week', 'video_proof']
const HABIT_KEYS: Record<string, string> = {
  gym: 'gym_sweat_proof',
  study: 'study_books_visible',
  wake_up_early: 'wake_up_sunrise',
  meditate: 'meditate_outdoor',
  quit_bad_habit: 'quit_replacement',
  journal: 'journal_handwritten',
  creative: 'creative_wip',
  cardio: 'cardio_distance',
  drink_water: 'water_gallon',
  healthy_eating: 'eating_ingredients',
}

function getAvailableChallenges(habitType: string): string[] {
  const challenges = [...UNIVERSAL_KEYS]
  if (HABIT_KEYS[habitType]) {
    challenges.push(HABIT_KEYS[habitType])
  }
  return challenges
}

function pickChallenge(available: string[], previousKey: string | null): string {
  // Avoid repeating the same challenge back-to-back
  const filtered = previousKey
    ? available.filter((k) => k !== previousKey)
    : available

  const pool = filtered.length > 0 ? filtered : available
  return pool[Math.floor(Math.random() * pool.length)]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify cron secret
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')

    if (!expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'CRON_SECRET not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!webhookSecret || webhookSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Calculate dates
    const now = new Date()
    const dayOfWeek = now.getDay()

    // Current week's Monday
    const currentMonday = new Date(now)
    currentMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    currentMonday.setHours(0, 0, 0, 0)
    const currentWeekStart = currentMonday.toISOString().split('T')[0]

    // Current week's Sunday
    const currentSunday = new Date(currentMonday)
    currentSunday.setDate(currentMonday.getDate() + 6)
    const currentWeekEnd = currentSunday.toISOString().split('T')[0]

    // Next week
    const nextMonday = new Date(currentMonday)
    nextMonday.setDate(currentMonday.getDate() + 7)
    const nextWeekStart = nextMonday.toISOString().split('T')[0]
    const nextSunday = new Date(nextMonday)
    nextSunday.setDate(nextMonday.getDate() + 6)
    const nextWeekEnd = nextSunday.toISOString().split('T')[0]

    console.log(`Rotating challenges. Current week: ${currentWeekStart} to ${currentWeekEnd}`)

    // Get all groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, habit_type')

    if (groupsError) throw groupsError

    console.log(`Processing ${groups?.length || 0} groups`)

    let created = 0
    let skipped = 0

    for (const group of groups || []) {
      try {
        // Check if this week's challenge already exists
        const { data: existing } = await supabase
          .from('weekly_challenges')
          .select('id, challenge_key')
          .eq('group_id', group.id)
          .eq('week_start', nextWeekStart)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        // Get the current week's challenge key (to avoid repeat)
        const { data: currentChallenge } = await supabase
          .from('weekly_challenges')
          .select('challenge_key, next_challenge_key')
          .eq('group_id', group.id)
          .eq('week_start', currentWeekStart)
          .maybeSingle()

        // Mark current week's results as announced
        if (currentChallenge) {
          await supabase
            .from('weekly_challenges')
            .update({ results_announced: true })
            .eq('group_id', group.id)
            .eq('week_start', currentWeekStart)
        }

        const available = getAvailableChallenges(group.habit_type)
        const previousKey = currentChallenge?.challenge_key || null

        // Use the previewed next challenge if available, otherwise pick new
        const nextChallengeKey = currentChallenge?.next_challenge_key || pickChallenge(available, previousKey)

        // Pick the preview for the week after next
        const previewKey = pickChallenge(available, nextChallengeKey)

        // Insert next week's challenge
        const { error: insertError } = await supabase
          .from('weekly_challenges')
          .insert({
            group_id: group.id,
            challenge_key: nextChallengeKey,
            week_start: nextWeekStart,
            week_end: nextWeekEnd,
            next_challenge_key: previewKey,
          })

        if (insertError) {
          console.error(`Error inserting challenge for group ${group.id}:`, insertError)
        } else {
          created++
        }

        // Also ensure current week has a challenge (bootstrap for new groups)
        const { data: currentExists } = await supabase
          .from('weekly_challenges')
          .select('id')
          .eq('group_id', group.id)
          .eq('week_start', currentWeekStart)
          .maybeSingle()

        if (!currentExists) {
          const currentChallengeKey = pickChallenge(available, null)
          await supabase
            .from('weekly_challenges')
            .insert({
              group_id: group.id,
              challenge_key: currentChallengeKey,
              week_start: currentWeekStart,
              week_end: currentWeekEnd,
              next_challenge_key: nextChallengeKey,
            })
          console.log(`Bootstrapped current week challenge for group ${group.id}`)
        }
      } catch (groupError) {
        console.error(`Error processing group ${group.id}:`, groupError)
      }
    }

    console.log(`Challenge rotation complete. Created: ${created}, Skipped: ${skipped}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Challenges rotated. Created: ${created}, Skipped: ${skipped}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Challenge rotation error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
