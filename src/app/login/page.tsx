'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.success) {
        // Redirection for ALL users is now /upload
        router.push('/upload');
        router.refresh();
      } else {
        setError('שם משתמש או סיסמה שגויים');
      }
    } catch (err) {
      setError('שגיאה בהתחברות. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm bg-elevated rounded-2xl p-8 border border-border-subtle shadow-2xl flex flex-col gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal/20">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">מערכת שרלוקד סושיאל</h2>
          <p className="text-secondary text-sm">הזן פרטי גישה כדי להמשיך</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">שם משתמש</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-base border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all text-left"
              placeholder="Username"
              dir="ltr"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">סיסמה</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-base border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all text-left"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm py-2.5 px-4 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="mt-2 bg-teal hover:bg-teal/90 text-base font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal/20 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>התחבר למערכת</span>
                <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-secondary/60">
            Sherlocked Digital © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
