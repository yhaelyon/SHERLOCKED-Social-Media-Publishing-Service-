export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 flex-1">
      <header>
        <h2 className="text-2xl font-bold text-primary">הגדרות מנהל</h2>
        <p className="text-secondary text-sm mt-1">ניהול המערכת והגדרות מתקדמות</p>
      </header>

      <div className="flex flex-col gap-4">
        <a href="/admin/social" className="bg-elevated hover:bg-hover hover:border-teal/50 transition-colors border border-border-subtle rounded-xl p-5 flex items-center justify-between group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-surface rounded-lg text-teal">
              <svg xmlns="http://www.2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </div>
            <div>
              <p className="text-primary font-medium text-lg">חיבורי סושיאל</p>
              <p className="text-secondary text-sm mt-0.5">ניהול אסימוני גישה ל-Meta</p>
            </div>
          </div>
          <svg className="text-secondary group-hover:text-teal transition-colors" xmlns="http://www.2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </a>
      </div>
    </div>
  );
}
