import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function PATCH(req: Request) {
    const { id, specific_prompt } = await req.json();
    const { error } = await supabase.from('rooms').update({ specific_prompt }).eq('id', id);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
}
