import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface DayStatus {
  day: string;
  posted: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify webhook secret for cron job authentication
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    if (!expectedSecret) {
      console.error('CRON_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.warn('Unauthorized access attempt to generate-weekly-recap')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Calculate last week's date range (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    const lastSunday = new Date(now)
    lastSunday.setDate(now.getDate() - daysToMonday - 1)
    lastSunday.setHours(23, 59, 59, 999)
    
    const lastMonday = new Date(lastSunday)
    lastMonday.setDate(lastSunday.getDate() - 6)
    lastMonday.setHours(0, 0, 0, 0)

    const weekStartStr = lastMonday.toISOString().split('T')[0]
    const weekEndStr = lastSunday.toISOString().split('T')[0]
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    console.log(`Generating recaps for week: ${weekStartStr} to ${weekEndStr}`)

    // Get all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name')
    
    if (profilesError) throw profilesError

    console.log(`Processing ${profiles?.length || 0} users`)

    for (const profile of profiles || []) {
      try {
        // Check if recap already exists
        const { data: existing } = await supabase
          .from('weekly_recaps')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('week_start', weekStartStr)
          .single()

        if (existing) {
          console.log(`Recap already exists for user ${profile.user_id}`)
          continue
        }

        // Get user's checkins for last week
        const { data: checkins } = await supabase
          .from('checkins')
          .select('created_at, group_id')
          .eq('user_id', profile.user_id)
          .gte('created_at', lastMonday.toISOString())
          .lte('created_at', lastSunday.toISOString())

        // Build day statuses
        const dayStatuses: DayStatus[] = []
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(lastMonday)
          checkDate.setDate(lastMonday.getDate() + i)
          const dateStr = checkDate.toISOString().split('T')[0]
          
          const posted = checkins?.some(c => {
            const checkinDate = new Date(c.created_at).toISOString().split('T')[0]
            return checkinDate === dateStr
          }) || false
          
          dayStatuses.push({ day: dayNames[i], posted })
        }

        const daysPosted = dayStatuses.filter(d => d.posted).length

        // Get current streak
        const { data: streaks } = await supabase
          .from('streaks')
          .select('current_streak, longest_streak')
          .eq('user_id', profile.user_id)

        const currentStreak = streaks?.[0]?.current_streak || 0
        const longestStreakMonth = Math.max(...(streaks?.map(s => s.longest_streak) || [0]))

        // Compute streak_change vs. previous week's stored recap
        const prevWeekStart = new Date(lastMonday)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0]

        const { data: prevRecap } = await supabase
          .from('weekly_recaps')
          .select('current_streak')
          .eq('user_id', profile.user_id)
          .eq('week_start', prevWeekStartStr)
          .maybeSingle()

        const streakChange = prevRecap ? currentStreak - prevRecap.current_streak : 0

        // Get group info for the first group
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', profile.user_id)
          .limit(1)

        let groupRank = null, groupTotal = null, groupConsistency = null, userConsistency = null
        let bestPerformerName = null, bestPerformerDays = null
        let strugglingMemberName = null, strugglingMemberDays = null
        let groupId: string | null = null

        if (memberships && memberships.length > 0) {
          groupId = memberships[0].group_id

          // Get all members of the group
          const { data: members } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)

          if (members && members.length > 0) {
            groupTotal = members.length

            // Get checkins for all members
            const memberStats = await Promise.all(
              members.map(async (m) => {
                const { data: memberProfile } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('user_id', m.user_id)
                  .single()

                const { data: memberCheckins } = await supabase
                  .from('checkins')
                  .select('created_at')
                  .eq('user_id', m.user_id)
                  .eq('group_id', groupId)
                  .gte('created_at', lastMonday.toISOString())
                  .lte('created_at', lastSunday.toISOString())

                const uniqueDays = new Set(
                  memberCheckins?.map(c => new Date(c.created_at).toISOString().split('T')[0])
                ).size

                return {
                  userId: m.user_id,
                  name: memberProfile?.name || 'Unknown',
                  daysPosted: uniqueDays,
                }
              })
            )

            // Sort by days posted
            memberStats.sort((a, b) => b.daysPosted - a.daysPosted)

            // Find user's rank
            const userIdx = memberStats.findIndex(m => m.userId === profile.user_id)
            groupRank = userIdx + 1

            // Group and user consistency
            const totalGroupDays = memberStats.reduce((sum, m) => sum + m.daysPosted, 0)
            groupConsistency = Math.round((totalGroupDays / (members.length * 7)) * 100)
            userConsistency = Math.round((daysPosted / 7) * 100)

            // Best and struggling members
            if (memberStats.length > 0) {
              bestPerformerName = memberStats[0].name
              bestPerformerDays = memberStats[0].daysPosted
              strugglingMemberName = memberStats[memberStats.length - 1].name
              strugglingMemberDays = memberStats[memberStats.length - 1].daysPosted
            }
          }
        }

        // Calculate next milestone
        const milestones = [
          { days: 7, name: '7-day streak 🔥' },
          { days: 14, name: '2-week streak 💪' },
          { days: 30, name: '30-day streak 🏆' },
          { days: 60, name: '60-day streak 👑' },
          { days: 100, name: '100-day streak 🌟' },
          { days: 365, name: '1-year streak 🎉' },
        ]

        const nextMilestone = milestones.find(m => m.days > currentStreak)
        const nextMilestoneDays = nextMilestone ? nextMilestone.days - currentStreak : null
        const nextMilestoneName = nextMilestone?.name || null

        // Find productive/tough days and earliest post
        const dayPostCounts: Record<string, number> = {}
        dayNames.forEach(day => { dayPostCounts[day] = 0 })

        let earliestPostTime: string | null = null
        let earliestPostDay: string | null = null

        if (checkins) {
          for (const c of checkins) {
            const checkinDate = new Date(c.created_at)
            const dayIdx = checkinDate.getDay()
            const dayName = dayNames[dayIdx === 0 ? 6 : dayIdx - 1]
            dayPostCounts[dayName]++

            const timeStr = checkinDate.toTimeString().slice(0, 5)
            if (!earliestPostTime || timeStr < earliestPostTime) {
              earliestPostTime = timeStr
              earliestPostDay = dayName
            }
          }
        }

        const sortedDays = Object.entries(dayPostCounts).sort((a, b) => b[1] - a[1])
        const mostProductiveDay = sortedDays[0]?.[1] > 0 ? sortedDays[0][0] : null
        const toughestDay = sortedDays[sortedDays.length - 1]?.[0] || null

        // Insert recap
        const { error: insertError } = await supabase
          .from('weekly_recaps')
          .insert({
            user_id: profile.user_id,
            week_start: weekStartStr,
            week_end: weekEndStr,
            days_posted: daysPosted,
            day_statuses: dayStatuses,
            current_streak: currentStreak,
            streak_change: streakChange,
            longest_streak_month: longestStreakMonth,
            group_id: groupId,
            group_rank: groupRank,
            group_total: groupTotal,
            group_consistency: groupConsistency,
            user_consistency: userConsistency,
            best_performer_name: bestPerformerName,
            best_performer_days: bestPerformerDays,
            struggling_member_name: strugglingMemberName,
            struggling_member_days: strugglingMemberDays,
            most_productive_day: mostProductiveDay,
            toughest_day: toughestDay,
            earliest_post_time: earliestPostTime,
            earliest_post_day: earliestPostDay,
            next_milestone_days: nextMilestoneDays,
            next_milestone_name: nextMilestoneName,
          })

        if (insertError) {
          console.error(`Error inserting recap for ${profile.user_id}:`, insertError)
        } else {
          console.log(`Generated recap for user ${profile.user_id}`)
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Weekly recaps generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error generating recaps:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})