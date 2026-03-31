import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || '';

export async function POST(req: Request) {
  try {
    const { roomName } = await req.json();

    // 1. Fetch Room Specific Prompt and Global Prompt
    const { data: roomData } = await supabase
      .from('rooms')
      .select('specific_prompt, branch')
      .eq('name', roomName)
      .single();
    
    const { data: systemData } = await supabase
      .from('system_settings')
      .select('general_prompt')
      .eq('id', 'global')
      .single();

    const specificPrompt = roomData?.specific_prompt || '';
    const generalPrompt = systemData?.general_prompt || '';
    const branch = roomData?.branch || '';

    // 2. Fetch Post Counter for cycling
    const { data: counter, error: countErr } = await supabase
      .from('post_counter')
      .select('count')
      .eq('id', 1)
      .single();
    
    const nextCount = (counter?.count || 0) + 1;
    await supabase.from('post_counter').update({ count: nextCount }).eq('id', 1);
    
    const index = (nextCount % 5) || 5; // 1-5 index

    const systemMessage = `
You are a social media expert for "Sherlocked" escape rooms. 
Your task is to generate a viral, engaging caption in HEBREW for a photo/video of players who just finished an escape room.

BRANCH: ${branch}
ROOM: ${roomName}

SPECIFIC ROOM DETAILS:
${specificPrompt}

GENERAL INFORMATION/EVENTS:
${generalPrompt}

CAPTURING STYLE:
Post Variation #${index} (Make this unique compared to other variations).
Use emojis, hashtags like #שרלוקד #חדרבריחה #Sherlocked.
Keep it authentic, exciting, and encouraging others to book.
The tone should be fun and slightly mysterious.
Do NOT use placeholders like [Name]. Use general terms like "האלופים האלה" or "הקבוצה המטורפת הזאת".
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://sherlocked.co.il',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: 'צור כיתוב קצר וקולע לפוסט באינסטגרם ובפייסבוק עבור הקבוצה שבתמונה.' }
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const caption = data.choices[0].message.content;

    return NextResponse.json({ caption, postIndex: index });

  } catch (err: any) {
    console.error('Caption Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
