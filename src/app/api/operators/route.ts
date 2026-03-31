import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  const { name } = await req.json();
  const { data, error } = await supabase.from('operators').insert({ name }).select();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data[0]);
}

export async function PATCH(req: Request) {
  const { id, is_active } = await req.json();
  const { error } = await supabase.from('operators').update({ is_active }).eq('id', id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
