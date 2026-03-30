import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getNextPostIndex(): Promise<number> {
  const { data, error } = await supabase
    .from('post_counter')
    .select('total_count')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching post_counter:', error);
  }

  const currentCount = data?.total_count || 0;
  const newCount = currentCount + 1;
  const postIndex = (newCount % 5) === 0 ? 5 : (newCount % 5);

  const { error: updateError } = await supabase
    .from('post_counter')
    .upsert({ id: 1, total_count: newCount });

  if (updateError) {
    console.error('Error updating post_counter:', updateError);
  }

  return postIndex;
}

function buildCaptionPrompt(postIndex: number): string {
  return `You are a marketing expert for an escape room business in Israel with 10 years of experience.

Business name: Sherlocked
Location: Rishon LeZion

Write a short and catchy caption in Hebrew for Instagram and Facebook.

Goals:
- attract families with kids
- attract birthday events
- attract groups of friends

Tone:
exciting, fun, mysterious, energetic

Input:
post_index = ${postIndex}

Instructions:
- Hebrew only
- 1 short sentence
- Add emojis
- Add 5 relevant hashtags in Hebrew

Rules:
If post_index = 5:
- Add a strong call to action (הזמינו עכשיו / נשארו מקומות בודדים / מהרו להזמין)
- Create urgency

If post_index is 1–4:
- DO NOT include any call to action
- Focus on fun, excitement, success, and experience

Output:
Caption only`;
}

export async function POST() {
  try {
    const postIndex = await getNextPostIndex();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || ''}`,
        'HTTP-Referer': 'https://sherlocked.co.il',
        'X-Title': 'Sherlocked Hub'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{
          role: 'user',
          content: buildCaptionPrompt(postIndex)
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json({ error: 'Failed to generate caption with AI', details: errorData }, { status: 500 });
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim();

    if (!caption) {
      return NextResponse.json({ error: 'AI returned an empty caption' }, { status: 500 });
    }

    return NextResponse.json({
      caption,
      postIndex
    });

  } catch (error: any) {
    console.error('Caption generation error:', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
