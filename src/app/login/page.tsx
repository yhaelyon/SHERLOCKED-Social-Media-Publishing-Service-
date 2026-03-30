export default function LoginPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <div className="w-full max-w-sm bg-elevated rounded-xl p-8 border border-border-subtle shadow-xl flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">התחברות למערכת</h2>
          <p className="text-secondary text-sm">הזן את פרטי הגישה שלך כדי להמשיך</p>
        </div>
        
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">אימייל</label>
            <input 
              type="email" 
              className="bg-base border border-border-subtle rounded-md px-4 py-2.5 text-primary focus:outline-none focus:border-teal transition-colors text-left"
              placeholder="name@sherlocked.co.il"
              dir="ltr"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">סיסמה</label>
            <input 
              type="password" 
              className="bg-base border border-border-subtle rounded-md px-4 py-2.5 text-primary focus:outline-none focus:border-teal transition-colors text-left"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>
          <button 
            type="button"
            className="mt-2 bg-teal hover:bg-teal/90 text-base font-bold py-3 rounded-md transition-all shadow-lg shadow-teal/20"
          >
            התחבר
          </button>
        </form>
      </div>
    </div>
  );
}
