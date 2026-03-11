import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface VerifyRequest {
  checkin_id: string
  group_id: string
  photo_url: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!

    // Create user-scoped client for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service role client for reading challenges
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { checkin_id, group_id, photo_url }: VerifyRequest = await req.json()

    if (!checkin_id || !group_id || !photo_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is a member of the group
    const { data: membership } = await supabaseUser
      .from('group_members')
      .select('user_id')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this group' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current week's challenge for this group
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const weekStartStr = monday.toISOString().split('T')[0]

    const { data: challenge } = await supabaseAdmin
      .from('weekly_challenges')
      .select('*')
      .eq('group_id', group_id)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (!challenge) {
      return new Response(
        JSON.stringify({ verified: false, reason: 'No active challenge this week', points: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the group's habit type
    const { data: groupData } = await supabaseAdmin
      .from('groups')
      .select('habit_type')
      .eq('id', group_id)
      .single()

    // Challenge definitions (inline for edge function)
    const challengeDefs: Record<string, {
      multiplier: number
      verificationType: string
      timeRange?: [number, number]
      validDays?: number[]
      aiPrompt?: string
    }> = {
      early_bird: { multiplier: 3, verificationType: 'timestamp', timeRange: [0, 7] },
      weekend_warriors: { multiplier: 2, verificationType: 'timestamp', validDays: [0, 6] },
      night_owl: { multiplier: 2.5, verificationType: 'timestamp', timeRange: [21, 24] },
      perfect_week: { multiplier: 5, verificationType: 'streak' },
      video_proof: { multiplier: 1.5, verificationType: 'ai_video', aiPrompt: 'Verify this is a video submission, not a static photo.' },
      gym_sweat_proof: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this gym/workout photo. Does the person show visible signs of physical exertion such as sweat, flushed/red skin, heavy breathing posture, or mid-exercise intensity? Look for sweat on face/body, wet workout clothes, or strained expressions.' },
      study_books_visible: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this study/reading photo. Are there visible study materials such as books, textbooks, notebooks, printed papers, flashcards, or academic documents in the frame?' },
      wake_up_sunrise: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this morning/wake-up photo. Is there a window visible showing early morning light, dawn, or sunrise? Look for warm golden/orange light coming through a window.' },
      meditate_outdoor: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this meditation photo. Is the person outdoors in a natural setting? Look for visible nature elements such as trees, grass, sky, flowers, parks, gardens.' },
      quit_replacement: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this photo. Does the photo show a healthy replacement activity such as exercise, drinking water/tea, eating healthy food, practicing a hobby, reading, or any positive coping mechanism?' },
      journal_handwritten: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this journaling photo. Is there visible handwriting on paper? Look for a notebook, journal, or diary with actual handwritten text.' },
      creative_wip: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this creative work photo. Does it show a work-in-progress? Look for visible tools, raw materials, rough drafts, sketches, or the creation process happening.' },
      cardio_distance: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this cardio/running photo. Are there visible fitness app statistics on a phone screen or smartwatch? Look for displayed distance, pace, time, route maps.' },
      water_gallon: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this hydration photo. Is there a large water container visible — such as a gallon jug, large water bottle (1L+), water pitcher?' },
      eating_ingredients: { multiplier: 2, verificationType: 'ai_photo', aiPrompt: 'Analyze this healthy eating photo. Are there visible raw or fresh ingredients such as uncooked vegetables, fresh fruits, raw proteins, fresh herbs?' },
    }

    const def = challengeDefs[challenge.challenge_key]
    if (!def) {
      return new Response(
        JSON.stringify({ verified: false, reason: 'Unknown challenge type', points: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let verified = false
    let reason = ''
    let points = 0

    // ============= TIMESTAMP VERIFICATION =============
    if (def.verificationType === 'timestamp') {
      const postTime = new Date()

      if (def.timeRange) {
        const hour = postTime.getHours()
        if (hour >= def.timeRange[0] && hour < def.timeRange[1]) {
          verified = true
          reason = `Posted at ${hour}:${String(postTime.getMinutes()).padStart(2, '0')} — within qualifying window`
        } else {
          reason = `Posted at ${hour}:${String(postTime.getMinutes()).padStart(2, '0')} — outside qualifying window (${def.timeRange[0]}:00-${def.timeRange[1]}:00)`
        }
      }

      if (def.validDays) {
        const day = postTime.getDay()
        if (def.validDays.includes(day)) {
          verified = true
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          reason = `Posted on ${dayNames[day]} — qualifies for weekend bonus`
        } else {
          reason = 'Posted on a weekday — weekend posts only'
        }
      }

      if (verified) {
        points = def.multiplier
      }
    }

    // ============= STREAK VERIFICATION =============
    else if (def.verificationType === 'streak') {
      // Perfect week is calculated at end of week by rotation function
      // For now, give 1 base point per post
      verified = true
      points = 1
      reason = 'Post counted towards Perfect Week challenge'
    }

    // ============= AI PHOTO/VIDEO VERIFICATION =============
    else if (def.verificationType === 'ai_photo' || def.verificationType === 'ai_video') {
      try {
        const systemPrompt = `You are a challenge verification system for a habit-tracking app called HABITZ. Your job is to verify whether a user's photo meets specific challenge criteria.

You MUST respond with a JSON object containing:
- "verified": boolean (true if the photo meets the criteria, false otherwise)
- "reason": string (brief explanation of why, max 50 words)

Be fair but firm. Give the benefit of the doubt when the image is ambiguous, but reject clear mismatches. Do not be overly strict.`

        const userPrompt = `Challenge criteria: ${def.aiPrompt}

Analyze the attached image and determine if it meets the criteria. Respond ONLY with JSON: {"verified": true/false, "reason": "explanation"}`

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: userPrompt },
                  { type: 'image_url', image_url: { url: photo_url } },
                ],
              },
            ],
          }),
        })

        if (!aiResponse.ok) {
          const statusCode = aiResponse.status
          if (statusCode === 429) {
            return new Response(
              JSON.stringify({ error: 'AI rate limit reached. Try again in a moment.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          if (statusCode === 402) {
            return new Response(
              JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          throw new Error(`AI gateway returned ${statusCode}`)
        }

        const aiData = await aiResponse.json()
        const content = aiData.choices?.[0]?.message?.content || ''

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          verified = !!parsed.verified
          reason = parsed.reason || (verified ? 'Challenge criteria met' : 'Challenge criteria not met')
        } else {
          reason = 'Could not parse AI verification response'
        }

        if (verified) {
          points = def.multiplier
        }
      } catch (aiError) {
        console.error('AI verification error:', aiError)
        // Fail safely — do not auto-approve on errors
        verified = false
        points = 0
        reason = 'AI verification temporarily unavailable — please try again'
      }
    }

    // ============= SAVE SCORE =============
    if (verified || def.verificationType === 'streak') {
      const { error: scoreError } = await supabaseAdmin
        .from('challenge_scores')
        .upsert({
          challenge_id: challenge.id,
          user_id: user.id,
          checkin_id: checkin_id,
          points: points,
          verified: verified,
          verification_reason: reason,
        }, {
          onConflict: 'challenge_id,checkin_id',
        })

      if (scoreError) {
        console.error('Error saving challenge score:', scoreError)
      }
    }

    return new Response(
      JSON.stringify({
        verified,
        reason,
        points,
        multiplier: def.multiplier,
        challenge_key: challenge.challenge_key,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Challenge verification error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
