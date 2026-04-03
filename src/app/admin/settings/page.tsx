"use client";

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Save, Calendar, MessageSquare, DoorOpen, Plus, Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data State
  const [operators, setOperators] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ general_prompt: '', retention_days: 30 });
  
  // New Items State
  const [newOperator, setNewOperator] = useState('');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [initRes, settingsRes] = await Promise.all([
      fetch('/api/init'),
      fetch('/api/settings')
    ]);
    const initData = await initRes.json();
    const settingsData = await settingsRes.json();
    
    setOperators(initData.operators || []);
    setRooms(initData.rooms || []);
    setSettings(settingsData || { general_prompt: '', retention_days: 30 });
    setLoading(false);
  };

  const addOperator = async () => {
    if (!newOperator) return;
    const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOperator })
    });
    if (res.ok) {
        setNewOperator('');
        fetchData();
    }
  };

  const toggleOperatorStatus = async (id: string, active: boolean) => {
    await fetch(`/api/operators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !active })
    });
    fetchData();
  };

  const saveSettings = async () => {
    setSaving(true);
    await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    setSaving(false);
  };

  const saveRoomPrompt = async (id: string, prompt: string) => {
    await fetch(`/api/rooms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, specific_prompt: prompt })
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-teal animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto w-full pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-primary">הגדרות ניהול</h2>
          <p className="text-secondary mt-1">נהל מפעילים, פרומפטים והגדרות מערכת</p>
        </div>
        <button 
          onClick={saveSettings}
          disabled={saving}
          className="bg-teal text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          שמור כלל ההגדרות
        </button>
      </header>

      <div className="flex flex-col gap-8">
        
        {/* TOP SECTION: GENERAL SETTINGS & OPERATORS */}
        <div className="flex flex-col gap-8">
          
          {/* Section: Global Prompt */}
          <section className="bg-elevated rounded-3xl p-6 border border-border-subtle shadow-xl">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-6 border-b border-border-subtle pb-4">
              <MessageSquare className="w-5 h-5 text-teal" /> הודעה כללית (חגים ואירועים)
            </h3>
            <textarea 
              value={settings.general_prompt}
              onChange={(e) => setSettings({ ...settings, general_prompt: e.target.value })}
              className="w-full bg-base border border-border-subtle rounded-2xl p-4 text-primary h-32 focus:outline-none focus:ring-2 focus:ring-teal/50 transition-all text-right"
              placeholder="למשל: מבצעי פסח מטורפים! 15% הנחה לכל חדר..."
            />
          </section>

          {/* Section: Data Retention */}
          <section className="bg-elevated rounded-3xl p-6 border border-border-subtle shadow-xl">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-6 border-b border-border-subtle pb-4">
              <Calendar className="w-5 h-5 text-teal" /> שמירת נתונים (ימים)
            </h3>
            <div className="flex items-center gap-4">
               <input 
                 type="range" min="1" max="180" 
                 value={settings.retention_days}
                 onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
                 className="flex-1 accent-teal h-2 bg-base rounded-full appearance-none cursor-pointer"
               />
               <span className="bg-base border border-border-subtle px-4 py-2 rounded-xl text-teal font-black text-xl min-w-[70px] text-center">
                 {settings.retention_days}
               </span>
            </div>
            <p className="text-secondary text-xs mt-4">קבצים ומדיה יימחקו אוטומטית מהשרת לאחר תקופה זו.</p>
          </section>

          {/* Section: Operators Management */}
          <section className="bg-elevated rounded-3xl p-6 border border-border-subtle shadow-xl flex flex-col flex-1">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-6 border-b border-border-subtle pb-4">
              <UserPlus className="w-5 h-5 text-teal" /> ניהול מפעילים (עובדים)
            </h3>
            <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="flex-1 bg-base border border-border-subtle rounded-xl px-4 py-2.5 text-primary text-right"
                  placeholder="שם עובד חדש..."
                />
                <button onClick={addOperator} className="bg-surface border border-teal/20 text-teal px-4 rounded-xl hover:bg-teal hover:text-white transition-all">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
                {operators.map(op => (
                    <div key={op.id} className={`flex items-center justify-between p-3 rounded-xl border ${op.is_active ? 'bg-base/50 border-border-subtle' : 'bg-red-500/5 border-red-500/10 grayscale opacity-60'}`}>
                        <span className="font-bold text-primary">{op.name}</span>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => toggleOperatorStatus(op.id, op.is_active)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all ${op.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500' : 'bg-green-500/10 text-green-500 hover:bg-green-500'} hover:text-white`}
                            >
                                {op.is_active ? 'מחק' : 'שחזר'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          </section>

        </div>

        {/* BOTTOM SECTION: ROOMS AND PROMPTS */}
        <div className="flex flex-col gap-6">
           <section className="bg-elevated rounded-3xl border border-border-subtle shadow-xl overflow-hidden">
             <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-surface">
                <h3 className="text-xl font-black text-primary flex items-center gap-2">
                    <DoorOpen className="w-6 h-6 text-teal" /> פרומפטים לפי חדרים
                </h3>
             </div>
             
             <div className="flex flex-col">
                {['מערב', 'מזרח'].map((branch) => (
                    <div key={branch} className="border-b border-border-subtle last:border-0">
                        <div className="bg-base/30 px-6 py-3 text-secondary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <span>סניף {branch}</span>
                        </div>
                        {rooms.filter(r => r.branch === branch).map(room => (
                            <div key={room.id} className="border-t border-border-subtle/30 bg-elevated/40 first:border-0">
                                <button 
                                    onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-teal/5 transition-all text-right"
                                >
                                    <span className="font-bold text-primary">{room.name}</span>
                                    {expandedRoom === room.id ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
                                </button>
                                
                                {expandedRoom === room.id && (
                                    <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-200">
                                        <textarea 
                                            defaultValue={room.specific_prompt}
                                            onBlur={(e) => saveRoomPrompt(room.id, e.target.value)}
                                            className="w-full bg-base border border-border-subtle rounded-2xl p-4 text-primary h-40 focus:outline-none focus:ring-1 focus:ring-teal/30 transition-all text-right text-sm leading-relaxed"
                                            placeholder={`כתוב מידע ספציפי על החדר ${room.name} שיעזור ל-AI ליצור כיתובים מדויקים יותר...`}
                                        />
                                        <div className="flex justify-end mt-2">
                                            <span className="text-[10px] text-secondary/60 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-green-500" /> נשמר אוטומטית בעזיבת השדה
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
             </div>
           </section>
        </div>

      </div>
    </div>
  );
}
