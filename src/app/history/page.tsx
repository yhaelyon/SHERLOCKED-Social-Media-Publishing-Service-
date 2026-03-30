import { createClient } from '@supabase/supabase-js';
import { Calendar, Image as ImageIcon, Video, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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
    <div className="flex flex-col gap-6 flex-1">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">היסטוריית פרסומים</h2>
          <p className="text-secondary text-sm mt-1">צפה בפוסטים שפורסמו לאחרונה</p>
        </div>
        <div className="bg-elevated px-4 py-1.5 rounded-full border border-border-subtle text-xs font-medium text-secondary">
          {posts?.length || 0} פוסטים
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red flex items-start gap-3 p-4 rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">שגיאה בטעינת היסטוריה: {error.message}</p>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="bg-elevated rounded-xl p-8 border border-border-subtle flex flex-col items-center justify-center text-center gap-3">
            <Calendar className="w-12 h-12 text-border-subtle" />
            <div>
              <p className="text-primary font-medium text-lg">אין עדיין פרסומים</p>
              <p className="text-secondary text-sm mt-1">הפרסומים שיעלו למערכת יוצגו כאן</p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-elevated border border-border-subtle rounded-xl overflow-hidden flex flex-col group transition-all hover:border-teal/50">
              <div className="flex flex-col md:flex-row gap-4 p-4">
                
                {/* Media Thumbnail */}
                <div className="w-full md:w-32 h-32 shrink-0 bg-base rounded-lg border border-border-subtle flex items-center justify-center overflow-hidden relative">
                  {post.file_type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.file_url} alt="post" className="w-full h-full object-cover" />
                  ) : (
                    <video src={post.file_url} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-2 right-2 bg-base/80 backdrop-blur aspect-square p-1.5 rounded-full border border-white/10">
                    {post.file_type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-primary" /> : <Video className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-secondary flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs bg-surface border border-border text-secondary px-2 py-0.5 rounded-full">
                      אינדקס: {post.post_index}/5
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-primary mb-3 line-clamp-2 md:line-clamp-3 leading-relaxed" dir="rtl">
                    "{post.caption}"
                  </p>
                  
                  <div className="mt-auto flex items-center gap-x-4 gap-y-2 flex-wrap">
                    {[
                      { l: 'IG Feed', s: post.ig_feed_status },
                      { l: 'IG Story', s: post.ig_story_status },
                      { l: 'FB Feed', s: post.fb_feed_status },
                      { l: 'FB Story', s: post.fb_story_status }
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="text-secondary">{t.l}</span>
                        {t.s === 'published' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : t.s === 'failed' ? (
                          <XCircle className="w-4 h-4 text-red" />
                        ) : ( t.s === 'skipped' ? (
                          <span className="text-border-subtle tracking-tighter">--</span>
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-teal border-t-transparent animate-spin"></div>
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
