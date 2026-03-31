'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Save, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function PromptsAdmin() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: systemData } = await supabase.from('system_settings').select('general_prompt').eq('id', 'global').single();
    if (systemData) setGeneralPrompt(systemData.general_prompt);

    const { data: roomData } = await supabase.from('rooms').select('*').order('name');
    setRooms(roomData || []);
    setLoading(false);
  }

  async function saveGeneral() {
    setSaving(true);
    const { error } = await supabase.from('system_settings').upsert({ id: 'global', general_prompt: generalPrompt });
    setSaving(false);
    if (!error) {
      setStatus({ type: 'success', message: 'הפרומפט הכללי נשמר בהצלחה' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  }

  async function saveRoomPrompt(id: string, prompt: string) {
    setSaving(true);
    const { error } = await supabase.from('rooms').update({ specific_prompt: prompt }).eq('id', id);
    setSaving(false);
    if (!error) {
      setStatus({ type: 'success', message: 'פרומפט החדר נשמר' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full pb-20">
      <header className="flex items-center gap-4">
        <a href="/admin" className="p-2 hover:bg-hover rounded-full transition-colors text-secondary">
          <ChevronLeft className="w-6 h-6" />
        </a>
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">הגדרות בינה מלאכותית</h2>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-0.5">AI Prompt Templates</p>
        </div>
      </header>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in transition-all ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}

      {/* General Settings */}
      <section className="bg-elevated rounded-3xl p-8 border border-border-subtle shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Sparkles className="w-24 h-24 text-teal" />
        </div>
        <div className="flex flex-col gap-6 relative">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-primary flex items-center gap-3 leading-none">
              <span className="p-2 bg-teal/10 text-teal rounded-lg"><Save className="w-5 h-5" /></span>
              פרומפט כללי למערכת
            </h3>
            <button 
              onClick={saveGeneral}
              disabled={saving}
              className="bg-teal hover:bg-teal/90 text-white font-black px-6 py-2.5 rounded-full text-sm transition-all shadow-lg shadow-teal/20"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
          <p className="text-secondary text-sm font-medium leading-relaxed max-w-lg">
            כאן ניתן להגדיר מידע כללי על שרלוקד, אירועים קרובים, או סגנון כתיבה מועדף שיופיע בכל הפוסטים.
          </p>
          <textarea 
            value={generalPrompt}
            onChange={(e) => setGeneralPrompt(e.target.value)}
            className="bg-base border border-border-subtle rounded-2xl p-5 text-primary font-medium min-h-[160px] focus:outline-none focus:ring-2 focus:ring-teal/50 transition-all resize-none text-right"
            placeholder="ספר ל-AI על שרלוקד..."
            dir="rtl"
          />
        </div>
      </section>

      {/* Room Specific Settings */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-black text-secondary/60 px-2 uppercase tracking-widest">פרומפטים ספציפיים לחדרים ({rooms.length})</h3>
        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal border-t-transparent animate-spin rounded-full"></div></div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="bg-elevated/40 border border-border-subtle rounded-2xl p-6 flex flex-col gap-4 group hover:border-teal/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${room.branch === 'מערב' ? 'bg-teal' : 'bg-purple'}`}></span>
                    <p className="text-primary font-black text-lg">{room.name}</p>
                    <span className="bg-surface px-2.5 py-1 rounded-md text-[10px] font-black text-secondary/80 border border-border-subtle/50">סניף {room.branch}</span>
                  </div>
                  <button 
                    onClick={() => saveRoomPrompt(room.id, room.specific_prompt)}
                    className="p-2.5 hover:bg-teal hover:text-white rounded-xl transition-all text-secondary/60 bg-surface border border-border-subtle/50 shadow-sm"
                    title="שמור חדר"
                  >
                    <Save className="w-4.5 h-4.5" />
                  </button>
                </div>
                <textarea 
                  value={room.specific_prompt || ''}
                  onChange={(e) => {
                    const newRooms = rooms.map(r => r.id === room.id ? { ...r, specific_prompt: e.target.value } : r);
                    setRooms(newRooms);
                  }}
                  className="bg-base border border-border-subtle rounded-xl p-4 text-primary font-bold text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all resize-none text-right"
                  placeholder={`מה מיוחד בחדר ${room.name}?`}
                  dir="rtl"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
