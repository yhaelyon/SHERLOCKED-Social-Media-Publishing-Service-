import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Calendar, Image as ImageIcon, Video, CheckCircle2, XCircle, AlertCircle, User, DoorOpen, MapPin, Loader2 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 0;

export default async function HistoryPage() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-8 flex-1 max-w-5xl mx-auto w-full pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">היסטוריית פרסומים</h2>
          <p className="text-secondary mt-1">צפה בניהול מלא של הפוסטים והסטוריז שהועלו</p>
        </div>
        <div className="bg-teal/10 border border-teal/20 px-6 py-2 rounded-2xl text-sm font-black text-teal shadow-lg shadow-teal/5">
          {posts?.length || 0} פוסטים
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red flex items-start gap-3 p-6 rounded-2xl animate-in fade-in zoom-in">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <p className="text-sm font-bold">שגיאה בטעינת היסטוריה: {error.message}</p>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="bg-elevated rounded-3xl p-16 border border-border-subtle flex flex-col items-center justify-center text-center gap-6 shadow-xl">
            <div className="w-20 h-20 bg-base rounded-full flex items-center justify-center border border-border-subtle">
              <Calendar className="w-10 h-10 text-border-subtle" />
            </div>
            <div>
              <p className="text-primary font-black text-2xl">אין עדיין פרסומים</p>
              <p className="text-secondary mt-2">הפרסומים שיעלו למערכת ע״י המפעילים יוצגו כאן בזמן אמת</p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-elevated border border-border-subtle rounded-3xl overflow-hidden flex flex-col group transition-all hover:border-teal/50 hover:shadow-2xl hover:shadow-teal/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-6 p-6">
                
                {/* Media Thumbnail */}
                <div className="w-full md:w-48 h-48 shrink-0 bg-base rounded-2xl border border-border-subtle flex items-center justify-center overflow-hidden relative shadow-inner">
                  {post.file_type === 'image' ? (
                    <img src={post.file_url} alt="post" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                  ) : (
                    <video src={post.file_url} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md aspect-square p-2 rounded-xl border border-white/10 shadow-lg">
                    {post.file_type === 'image' ? <ImageIcon className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-white" />}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0 py-1">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-secondary flex items-center gap-1.5 bg-base px-3 py-1.5 rounded-lg border border-border-subtle/50">
                          <Calendar className="w-3.5 h-3.5 text-teal" />
                          {new Date(post.created_at).toLocaleDateString('he-IL', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'Asia/Jerusalem' 
                          })}
                        </span>
                        {post.operator_name && (
                           <span className="text-xs font-black text-teal flex items-center gap-1.5 bg-teal/5 px-3 py-1.5 rounded-lg border border-teal/10">
                             <User className="w-3.5 h-3.5" />
                             {post.operator_name}
                           </span>
                        )}
                    </div>
                    <span className="text-[10px] bg-surface border border-border-subtle text-secondary/60 px-3 py-1 rounded-full font-bold uppercase tracking-tighter">
                      POST INDEX: {post.post_index}/5
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                     {post.branch_name && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-secondary bg-base px-2 py-1 rounded border border-border-subtle">
                           <MapPin className="w-3 h-3 text-red-500/70" /> סניף {post.branch_name}
                        </span>
                     )}
                     {post.room_name && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-teal/10 px-2 py-1 rounded border border-teal/20">
                           <DoorOpen className="w-3 h-3 text-teal" /> {post.room_name}
                        </span>
                     )}
                  </div>
                  
                  <div className="bg-base/40 p-4 rounded-2xl border border-border-subtle/30 mb-6 group-hover:bg-base/60 transition-colors">
                    <p className="text-sm font-medium text-primary line-clamp-3 leading-relaxed" dir="rtl">
                      "{post.caption}"
                    </p>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-border-subtle/30 flex flex-wrap gap-2">
                    {[
                      { l: 'FB STORY', s: post.fb_story_status },
                      { l: 'FB FEED', s: post.fb_feed_status },
                      { l: 'IG STORY', s: post.ig_story_status },
                      { l: 'IG FEED', s: post.ig_feed_status }
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-surface/60 px-2.5 py-1.5 rounded-lg border border-border-subtle/50">
                        <span className="text-[9px] font-black text-secondary/70 uppercase tracking-tighter">{t.l}</span>
                        {t.s === 'published' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : t.s === 'failed' ? (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        ) : ( t.s === 'skipped' ? (
                          <span className="text-border-subtle text-[9px] font-black">--</span>
                        ) : (
                          <Loader2 className="w-3 h-3 text-teal animate-spin" />
                        ))}
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
