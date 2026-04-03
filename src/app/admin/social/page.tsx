"use client";

import { useState, useEffect } from 'react';
import { RefreshCcw, BarChart3, ChevronRight, CheckCircle2, XCircle, ShieldCheck, Activity, Loader2, AlertCircle } from 'lucide-react';

export default function AdminSocialPage() {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<any>(null);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
        // We'll call a combined status API
        const res = await fetch('/api/meta/status');
        const json = await res.json();
        setData(json);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const verifyConnection = async () => {
    setVerifying(true);
    setTestResult(null);
    try {
        const res = await fetch('/api/meta/verify');
        const json = await res.json();
        if (json.success) {
            setTestResult({ success: true, message: `החיבור תקין! הטוקן יפוג בעוד ${Math.floor((json.expires_at - Date.now()/1000)/86400)} ימים.` });
        } else {
            setTestResult({ success: false, message: `שגיאת חיבור: ${json.error}` });
        }
    } catch (err) {
        setTestResult({ success: false, message: 'נכשל בניסיון התחברות לשרת Meta' });
    } finally {
        setVerifying(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-teal animate-spin" /></div>;

  const isIgConnected = data?.ig?.username && !data?.ig?.error;
  const isFbConnected = data?.fb?.name && !data?.fb?.error;

  return (
    <div className="flex flex-col gap-8 flex-1 max-w-4xl mx-auto w-full pb-12">
      <header className="flex flex-col gap-2">
        <a href="/admin" className="text-secondary hover:text-primary text-sm flex items-center gap-1 w-fit transition-all hover:translate-x-1">
          <ChevronRight className="w-4 h-4" /> חזרה לתפריט ניהול
        </a>
        <div className="mt-2 text-right">
          <h2 className="text-3xl font-black text-primary tracking-tight">סטטוס חיבורי Meta</h2>
          <p className="text-secondary mt-1">בדיקת תקינות החיבור לאינסטגרם ופייסבוק</p>
        </div>
      </header>

      {testResult && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${testResult.success ? 'bg-teal/10 text-teal border border-teal/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
          {testResult.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{testResult.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Instagram Card */}
        <div className="bg-elevated rounded-3xl border border-border-subtle p-6 shadow-xl relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-1 h-full ${isIgConnected ? 'bg-teal' : 'bg-red-500'}`} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#E1306C]/10 text-[#E1306C] rounded-2xl">
                <svg xmlns="http://www.2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </div>
              <p className="text-xl font-black text-primary">Instagram</p>
            </div>
            {isIgConnected ? (
              <span className="bg-teal/10 text-teal px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">CONNECTED</span>
            ) : (
              <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">DISCONNECTED</span>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="bg-base/50 p-4 rounded-2xl border border-border-subtle/50">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-secondary uppercase opacity-50">Username</span>
                    <span className="text-primary font-bold text-lg" dir="ltr">@{data?.ig?.username || 'N/A'}</span>
                </div>
            </div>
            <div className="flex justify-between px-2 text-xs font-bold">
                <span className="text-secondary tracking-tight">Account ID</span>
                <span className="text-primary opacity-60" dir="ltr">{data?.ig_id || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Facebook Card */}
        <div className="bg-elevated rounded-3xl border border-border-subtle p-6 shadow-xl relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-1 h-full ${isFbConnected ? 'bg-[#1877F2]' : 'bg-red-500'}`} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl">
                <svg xmlns="http://www.2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </div>
              <p className="text-xl font-black text-primary">Facebook</p>
            </div>
            {isFbConnected ? (
              <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">CONNECTED</span>
            ) : (
              <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">DISCONNECTED</span>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="bg-base/50 p-4 rounded-2xl border border-border-subtle/50">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-secondary uppercase opacity-50">Page Name</span>
                    <span className="text-primary font-bold text-lg">{data?.fb?.name || 'N/A'}</span>
                </div>
            </div>
            <div className="flex justify-between px-2 text-xs font-bold">
                <span className="text-secondary tracking-tight">Page ID</span>
                <span className="text-primary opacity-60" dir="ltr">{data?.fb_id || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <button 
           onClick={verifyConnection}
           disabled={verifying}
           className="bg-white/5 hover:bg-teal hover:text-white border border-border-subtle hover:border-teal rounded-2xl py-6 transition-all shadow-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {verifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
          לחץ כאן לבדיקת תקינות החיבור
        </button>

        <button 
           className="bg-white/5 hover:bg-primary hover:text-base border border-border-subtle hover:border-primary rounded-2xl py-6 transition-all shadow-xl font-black text-lg flex items-center justify-center gap-3"
        >
          <RefreshCcw className="w-6 h-6" />
          רענון טוקן (חידוש ל-60 יום)
        </button>
      </div>

      <div className="bg-surface border border-border-subtle p-8 rounded-3xl mt-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-teal/10 rounded-lg text-teal"><Activity className="w-5 h-5" /></div>
            <h3 className="text-xl font-black text-primary">סטטיסטיקות שימוש</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-base/40 border border-border-subtle p-5 rounded-2xl">
              <p className="text-secondary text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">סה"כ פוסטים</p>
              <p className="text-3xl font-black text-primary">{data?.stats?.total || 0}</p>
            </div>
            <div className="bg-base/40 border border-border-subtle p-5 rounded-2xl">
              <p className="text-secondary text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">השבוע האחרון</p>
              <p className="text-3xl font-black text-teal">+{data?.stats?.week || 0}</p>
            </div>
            <div className="bg-base/40 border border-border-subtle p-5 rounded-2xl">
              <p className="text-secondary text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">יתרה לאצווה</p>
              <p className="text-3xl font-black text-primary">{(data?.stats?.counter % 5) || 0}/5</p>
            </div>
            <div className="bg-base/40 border border-border-subtle p-5 rounded-2xl">
               <p className="text-secondary text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">תוקף טוקן</p>
               <p className="text-3xl font-black text-orange-500">{data?.expires_days || 0}d</p>
            </div>
          </div>
      </div>
    </div>
  );
}
