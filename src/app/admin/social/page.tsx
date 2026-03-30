import { createClient } from '@supabase/supabase-js';
import { RefreshCcw, BarChart3, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 0;

export default async function AdminSocialPage() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ID;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  let igData = null;
  let fbData = null;
  let expiresDays = 0;

  try {
    const [igResult, fbResult] = await Promise.allSettled([
      fetch(`https://graph.facebook.com/v25.0/${igId}?fields=username,profile_picture_url&access_token=${token}`),
      fetch(`https://graph.facebook.com/v25.0/${pageId}?fields=name,id&access_token=${token}`)
    ]);

    igData = igResult.status === 'fulfilled' ? await igResult.value.json() : null;
    fbData = fbResult.status === 'fulfilled' ? await fbResult.value.json() : null;

    if (token) {
      const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
      const debugData = await debugRes.json();
      const expiresAt = debugData?.data?.expires_at ? new Date(debugData.data.expires_at * 1000) : null;
      expiresDays = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 86400000) : 0;
    }
  } catch (err) {
    console.error(err);
  }

  // Statistics
  const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: thisWeekPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

  const { data: counter } = await supabase.from('post_counter').select('total_count').single();
  const currentCount = counter?.total_count || 0;
  const currIndex = (currentCount % 5) === 0 && currentCount > 0 ? 5 : (currentCount % 5);

  const isIgConnected = igData && !igData.error;
  const isFbConnected = fbData && !fbData.error;

  return (
    <div className="flex flex-col gap-6 flex-1">
      <header className="flex flex-col gap-2">
        <a href="/admin" className="text-secondary hover:text-primary text-sm flex items-center gap-1 w-fit transition-colors">
          <ChevronRight className="w-4 h-4" /> חזרה להגדרות
        </a>
        <div className="mt-1">
          <h2 className="text-2xl font-bold text-primary">פאנל שליטה: סושיאל</h2>
          <p className="text-secondary text-sm mt-1">ניהול סטטוס חיבורים וסטטיסטיקת פרסומים</p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Instagram Card */}
        <div className="bg-elevated rounded-xl border border-border-subtle p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#E1306C]/10 text-[#E1306C] rounded-lg">
                <svg xmlns="http://www.2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </div>
              <p className="text-primary font-bold text-lg">Instagram</p>
            </div>
            {isIgConnected ? (
              <span className="bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" /> מחובר
              </span>
            ) : (
              <span className="bg-red/10 text-red px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4" /> מנותק
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between text-secondary">Account ID: <span className="text-primary" dir="ltr">{igId || 'N/A'}</span></div>
            <div className="flex justify-between text-secondary">Token expiration: <span className="text-primary">{expiresDays > 0 ? expiresDays + ' days' : 'Expired'}</span></div>
            <div className="flex justify-between text-secondary">Username: <span className="text-primary font-medium" dir="ltr">@{igData?.username || 'N/A'}</span></div>
          </div>
        </div>

        {/* Facebook Card */}
        <div className="bg-elevated rounded-xl border border-border-subtle p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#1877F2]/10 text-[#1877F2] rounded-lg">
                <svg xmlns="http://www.2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </div>
              <p className="text-primary font-bold text-lg">Facebook</p>
            </div>
            {isFbConnected ? (
              <span className="bg-green-500/10 text-green-500 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" /> מחובר
              </span>
            ) : (
              <span className="bg-red/10 text-red px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4" /> מנותק
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between text-secondary">Page ID: <span className="text-primary" dir="ltr">{pageId || 'N/A'}</span></div>
            <div className="flex justify-between text-secondary">Token expiration: <span className="text-primary">{expiresDays > 0 ? expiresDays + ' days' : 'Expired'}</span></div>
            <div className="flex justify-between text-secondary">Page Name: <span className="text-primary font-medium">{fbData?.name || 'N/A'}</span></div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm mt-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-teal" />
            <h3 className="text-lg font-bold text-primary">סטטיסטיקות</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-elevated border border-border-subtle p-4 rounded-lg flex flex-col items-center justify-center text-center">
              <p className="text-secondary text-xs mb-1">סה"כ פוסטים</p>
              <p className="text-2xl font-bold text-primary">{totalPosts || 0}</p>
            </div>
            <div className="bg-elevated border border-border-subtle p-4 rounded-lg flex flex-col items-center justify-center text-center">
              <p className="text-secondary text-xs mb-1">פורסמו השבוע</p>
              <p className="text-2xl font-bold text-teal">{thisWeekPosts || 0}</p>
            </div>
          </div>
          <div className="mt-3 bg-elevated border border-border-subtle p-4 rounded-lg flex items-center justify-between">
            <p className="text-secondary text-sm">אינדקס פוסט באצווה:</p>
            <p className="font-bold text-primary">{currIndex === 0 && currentCount === 0 ? '0' : currIndex}/5</p>
          </div>
        </div>

        <button className="bg-surface hover:bg-hover border border-border-subtle text-primary font-medium py-4 rounded-xl transition-colors w-full flex items-center justify-center gap-2 shadow-sm mt-2 group">
          <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          חדש טוקן ידנית (עדכון מפתח ל-60 יום)
        </button>
      </div>
    </div>
  );
}
