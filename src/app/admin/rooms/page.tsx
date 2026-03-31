'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, MapPin, DoorOpen, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function RoomsAdmin() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newBranch, setNewBranch] = useState('מערב');

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoading(true);
    const { data } = await supabase.from('rooms').select('*').order('branch').order('name');
    setRooms(data || []);
    setLoading(false);
  }

  async function addRoom() {
    if (!newName) return;
    setSaving(true);
    const { error } = await supabase.from('rooms').insert([{ name: newName, branch: newBranch }]);
    if (!error) {
      setNewName('');
      fetchRooms();
    }
    setSaving(true);
    setTimeout(() => setSaving(false), 500);
  }

  async function deleteRoom(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק חדר זה?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) fetchRooms();
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
      <header className="flex items-center gap-4">
        <a href="/admin" className="p-2 hover:bg-hover rounded-full transition-colors text-secondary">
          <ChevronLeft className="w-6 h-6" />
        </a>
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">ניהול חדרים</h2>
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mt-0.5">Quest Rooms Management</p>
        </div>
      </header>

      <div className="bg-elevated rounded-2xl p-6 border border-border-subtle shadow-xl">
        <h3 className="text-sm font-black text-secondary mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-teal" /> הוספת חדר קווסט חדש
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary px-1">שם החדר</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-base border border-border-subtle rounded-xl px-4 py-3 text-primary font-bold focus:outline-none focus:ring-2 focus:ring-teal/50"
              placeholder="לדוגמה: אנתרקס"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary px-1">סניף</label>
            <select 
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className="bg-base border border-border-subtle rounded-xl px-4 py-3 text-primary font-bold focus:outline-none focus:ring-2 focus:ring-teal/50"
            >
              <option value="מערב">שרלוקד מערב (אלטלנה)</option>
              <option value="מזרח">שרלוקד מזרח (משה בקר)</option>
            </select>
          </div>
          <button 
            onClick={addRoom}
            disabled={saving || !newName}
            className="bg-teal hover:bg-teal/90 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-teal/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            <span>הוסף חדר לרשימה</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black text-secondary/60 px-1 uppercase tracking-widest">רשימת חדרים קיימת ({rooms.length})</h3>
        
        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal border-t-transparent animate-spin rounded-full"></div></div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="bg-elevated/40 border border-border-subtle rounded-2xl p-4 flex items-center justify-between group hover:bg-elevated transition-colors shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${room.branch === 'מערב' ? 'bg-teal/10 text-teal' : 'bg-purple/10 text-purple'}`}>
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-primary font-black">{room.name}</p>
                  <p className="text-[10px] font-bold text-secondary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> סניף {room.branch}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => deleteRoom(room.id)}
                className="p-2 text-secondary/40 hover:text-red hover:bg-red/5 rounded-lg transition-all"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
