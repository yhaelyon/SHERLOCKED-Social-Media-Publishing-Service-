import { ChevronLeft, UserPlus, FileText, Sparkles, Share2 } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-10">
      <header>
        <h2 className="text-3xl font-black text-primary tracking-tight">ניהול מערכת</h2>
        <p className="text-secondary mt-1">פאנל שליטה למנהלים - שרלוקד סושיאל</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {/* Management & AI Settings */}
        <a href="/admin/settings" className="bg-elevated hover:bg-teal/5 hover:border-teal/50 transition-all border border-border-subtle rounded-3xl p-6 flex flex-col gap-4 group cursor-pointer shadow-xl shadow-black/5">
            <div className="w-12 h-12 bg-teal/10 rounded-2xl flex items-center justify-center text-teal group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-primary">הגדרות עובדים וחדרים</h3>
                <ChevronLeft className="w-5 h-5 text-secondary group-hover:text-teal group-hover:translate-x-[-4px] transition-all" />
              </div>
              <p className="text-secondary text-sm mt-2 leading-relaxed">ניהול מפעילים, הרשאות, ופרומפטים ייחודיים לחדרי הבריחה.</p>
            </div>
        </a>

        {/* Bonus Reports */}
        <a href="/admin/reports" className="bg-elevated hover:bg-blue-500/5 hover:border-blue-500/50 transition-all border border-border-subtle rounded-3xl p-6 flex flex-col gap-4 group cursor-pointer shadow-xl shadow-black/5">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-primary">דוחות ובונוסים</h3>
                <ChevronLeft className="w-5 h-5 text-secondary group-hover:text-blue-500 group-hover:translate-x-[-4px] transition-all" />
              </div>
              <p className="text-secondary text-sm mt-2 leading-relaxed">סיכום פעילות חודשית לפי מפעיל וייצא דוחות CSV לתשלום בונוסים.</p>
            </div>
        </a>

        {/* Social Meta Status */}
        <a href="/admin/social" className="bg-elevated hover:bg-[#1877F2]/5 hover:border-[#1877F2]/50 transition-all border border-border-subtle rounded-3xl p-6 flex flex-col gap-4 group cursor-pointer shadow-xl shadow-black/5">
            <div className="w-12 h-12 bg-[#1877F2]/10 rounded-2xl flex items-center justify-center text-[#1877F2] group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-primary">חיבורי Meta Social</h3>
                <ChevronLeft className="w-5 h-5 text-secondary group-hover:text-[#1877F2] group-hover:translate-x-[-4px] transition-all" />
              </div>
              <p className="text-secondary text-sm mt-2 leading-relaxed">בדיקת תקינות חיבורי פייסבוק ואינסטגרם ורענון טוקנים ידני.</p>
            </div>
        </a>
      </div>
    </div>
  );
}
