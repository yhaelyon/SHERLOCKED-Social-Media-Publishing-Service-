"use client";

import { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, Calendar, Loader2, User, ChevronRight, FileText } from 'lucide-react';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const res = await fetch('/api/history-raw'); // Need this endpoint
    const data = await res.json();
    setPosts(data || []);
    
    // Group by operator
    const grouped = (data || []).reduce((acc: any, post: any) => {
      const name = post.operator_name || 'ללא מפעיל';
      if (!acc[name]) acc[name] = { name, count: 0, posts: [] };
      acc[name].count++;
      acc[name].posts.push(post);
      return acc;
    }, {});
    
    setReportData(Object.values(grouped).sort((a: any, b: any) => b.count - a.count));
    setLoading(false);
  };

  const downloadCSV = () => {
    const header = "Operator Name,Total Posts\n";
    const rows = reportData.map(r => `${r.name},${r.count}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `social_operator_bonus_report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-teal animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto w-full pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-primary">סיכום בונוסים</h2>
          <p className="text-secondary mt-1">צפה בביצועי המפעילים וייצא דוחות לתשלום</p>
        </div>
        <button 
          onClick={downloadCSV}
          className="bg-teal text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal/20 transition-all hover:scale-105 active:scale-95"
        >
          <Download className="w-5 h-5" />
          ייצא דוח CSV
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-elevated border border-border-subtle p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-teal/10 p-3 rounded-2xl text-teal"><TrendingUp className="w-6 h-6" /></div>
                <span className="text-secondary font-bold text-sm">סה״כ פרסומים</span>
            </div>
            <p className="text-3xl font-black text-primary">{posts.length}</p>
        </div>
        <div className="bg-elevated border border-border-subtle p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500"><Users className="w-6 h-6" /></div>
                <span className="text-secondary font-bold text-sm">מפעילים פעילים</span>
            </div>
            <p className="text-3xl font-black text-primary">{reportData.length}</p>
        </div>
        <div className="bg-elevated border border-border-subtle p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-500"><Calendar className="w-6 h-6" /></div>
                <span className="text-secondary font-bold text-sm">חודש נוכחי</span>
            </div>
            <p className="text-3xl font-black text-primary">{new Date().toLocaleString('he-IL', { month: 'long' })}</p>
        </div>
      </div>

      <section className="bg-elevated rounded-3xl border border-border-subtle shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border-subtle bg-surface flex items-center justify-between">
           <h3 className="text-xl font-black text-primary flex items-center gap-3">
               <FileText className="w-6 h-6 text-teal" /> פירוט לפי מפעיל
           </h3>
        </div>
        
        <div className="flex flex-col">
           {reportData.map((data, i) => (
               <div key={i} className="group border-b border-border-subtle last:border-0 hover:bg-teal/5 transition-all p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="w-12 h-12 bg-base rounded-2xl flex items-center justify-center border border-border-subtle text-teal font-black text-xl shadow-inner">
                        {i + 1}
                     </div>
                     <div>
                        <h4 className="text-lg font-black text-primary flex items-center gap-2">
                            <User className="w-4 h-4 text-teal/40" /> {data.name}
                        </h4>
                        <p className="text-secondary text-xs mt-0.5">סה״כ {data.count} העלאות שאושרו ופורסמו</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">ביצועים</p>
                         <p className="font-black text-teal text-xl tracking-tighter">+{data.count}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-border-subtle group-hover:text-teal transition-all" />
                  </div>
               </div>
           ))}
        </div>
      </section>

      <div className="bg-teal/5 border border-teal/10 p-6 rounded-3xl text-center">
         <p className="text-sm font-bold text-teal flex items-center justify-center gap-2">
            <span className="text-lg">💡</span> המערכת מחשבת בונוס על בסיס העלאות מוצלחות בלבד.
         </p>
      </div>
    </div>
  );
}
