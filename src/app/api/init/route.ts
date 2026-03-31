import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: operators } = await supabase.from('operators').select('*').eq('is_active', true).order('name');
    const { data: rooms } = await supabase.from('rooms').select('*').order('branch', { ascending: false }).order('name');

    return NextResponse.json({ operators: operators || [], rooms: rooms || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
