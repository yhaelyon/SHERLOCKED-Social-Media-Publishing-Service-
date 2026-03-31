"use client";

import { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, Calendar, Loader2, User, ChevronRight, FileText, Filter, CheckCircle2 } from 'lucide-react';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    filterAndGroup();
  }, [allPosts, selectedMonth]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/history-raw');
        const data = await res.json();
        setAllPosts(data || []);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const filterAndGroup = () => {
    // Filter by month
    const filtered = allPosts.filter(post => post.created_at.startsWith(selectedMonth));
    setFilteredPosts(filtered);

    // Group by operator
    const grouped = filtered.reduce((acc: any, post: any) => {
      const name = post.operator_name || 'ללא מפעיל';
      if (!acc[name]) acc[name] = { name, count: 0 };
      acc[name].count++;
      return acc;
    }, {});
    
    setReportData(Object.values(grouped).sort((a: any, b: any) => b.count - a.count));
  };

  const downloadCSV = () => {
    if (reportData.length === 0) return;
    
    const header = "Operator Name,Total Posts,Month\n";
    const rows = reportData.map(r => `${r.name},${r.count},${selectedMonth}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sherlocked_bonus_report_${selectedMonth}.csv`);
    link.click();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-teal animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto w-full pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-right">
          <h2 className="text-3xl font-black text-primary tracking-tight">סיכום בונוסים חודשי</h2>
          <p className="text-secondary mt-1">צפה בביצועי המפעילים וייצא דוחות לתשלום</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal" />
                <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-elevated border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-primary font-bold focus:ring-2 focus:ring-teal/50 outline-none transition-all"
                />
            </div>
            <button 
              onClick={downloadCSV}
              disabled={reportData.length === 0}
              className="bg-teal text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-teal/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              ייצא CSV
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-elevated border border-border-subtle p-6 rounded-3xl shadow-xl border-b-4 border-b-teal">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-teal/10 p-3 rounded-2xl text-teal"><TrendingUp className="w-6 h-6" /></div>
                <span className="text-secondary font-bold text-sm">סה״כ לחודש זה</span>
            </div>
            <p className="text-4xl font-black text-primary">{filteredPosts.length}</p>
        </div>
        <div className="bg-elevated border border-border-subtle p-6 rounded-3xl shadow-xl border-b-4 border-b-blue-500">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500"><Users className="w-6 h-6" /></div>
                <span className="text-secondary font-bold text-sm">מפעילים פעילים</span>
            </div>
            <p className="text-4xl font-black text-primary">{reportData.length}</p>
        </div>
        <div className="bg-elevated border border-border-subtle p-6 rounded-3xl shadow-xl border-b-4 border-b-orange-500">
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-500"><Filter className="w-6 h-6" /></div>
                <span className="text-secondary font-bold text-sm">ממוצע למפעיל</span>
            </div>
            <p className="text-4xl font-black text-primary">
                {reportData.length > 0 ? (filteredPosts.length / reportData.length).toFixed(1) : 0}
            </p>
        </div>
      </div>

      <section className="bg-elevated rounded-3xl border border-border-subtle shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border-subtle bg-surface flex items-center justify-between">
           <h3 className="text-xl font-black text-primary flex items-center gap-3">
               <FileText className="w-6 h-6 text-teal" /> פירוט מפעילים - {new Date(selectedMonth).toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
           </h3>
        </div>
        
        <div className="flex flex-col">
           {reportData.length === 0 ? (
               <div className="p-20 text-center flex flex-col items-center gap-4">
                   <div className="w-16 h-16 bg-base rounded-full flex items-center justify-center border border-border-subtle">
                       <Calendar className="w-8 h-8 text-secondary opacity-20" />
                   </div>
                   <p className="text-secondary font-bold">אין נתונים לחודש שנבחר</p>
               </div>
           ) : reportData.map((data: any, i: number) => (
               <div key={i} className="group border-b border-border-subtle last:border-0 hover:bg-teal/5 transition-all p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <div className="w-14 h-14 bg-base rounded-2xl flex items-center justify-center border border-border-subtle text-teal font-black text-2xl shadow-inner group-hover:border-teal/30 transition-colors">
                        {i + 1}
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-primary flex items-center gap-2">
                            <User className="w-5 h-5 text-teal/40" /> {data.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-secondary text-xs">סה״כ העלאות מוצלחות</span>
                            <div className="w-1 h-1 bg-border-subtle rounded-full" />
                            <span className="text-teal font-black text-xs">{data.count} פוסטים</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                      <div className="text-left">
                         <p className="text-[10px] font-black text-secondary tracking-widest mb-1 opacity-50">PERFORMANCE</p>
                         <div className="flex items-baseline gap-1">
                             <span className="font-black text-primary text-2xl">+{data.count}</span>
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                         </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-border-subtle group-hover:text-teal group-hover:translate-x-1 transition-all" />
                  </div>
               </div>
           ))}
        </div>
      </section>

      <div className="bg-teal/5 border border-teal/10 p-8 rounded-3xl text-center shadow-inner">
         <p className="text-teal font-bold flex items-center justify-center gap-3">
            <span className="text-2xl">⚡️</span> 
            <span>המערכת מחשבת בונוסים על בסיס העלאות מוצלחות שבוצעו בחודש {new Date(selectedMonth).toLocaleString('he-IL', { month: 'long' })} בלבד.</span>
         </p>
      </div>
    </div>
  );
}
