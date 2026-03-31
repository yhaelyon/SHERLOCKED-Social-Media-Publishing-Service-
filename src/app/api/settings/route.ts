import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const { data } = await supabase.from('system_settings').select('*').eq('id', 'global').single();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const settings = await req.json();
  const { error } = await supabase.from('system_settings').upsert({
    id: 'global',
    general_prompt: settings.general_prompt,
    retention_days: settings.retention_days,
    updated_at: new Date().toISOString()
  });
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
