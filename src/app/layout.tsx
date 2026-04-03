import type { Metadata } from 'next';
import { Heebo, Inter } from 'next/font/google';
import './globals.css';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sherlocked | סושיאל',
  description: 'מערכת פרסום סושיאל של שרלוקד',
  icons: {
    icon: '/head-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-base text-primary font-sans antialiased flex justify-center selection:bg-teal selection:text-base">
        <div className="w-full max-w-[480px] bg-surface min-h-screen flex flex-col shadow-2xl overflow-x-hidden relative border-x border-border-subtle">
          
          {/* Top Bar Navigation */}
          <header className="h-20 border-b border-border-subtle flex items-center justify-between px-6 shrink-0 sticky top-0 bg-white/95 backdrop-blur-md z-50">
            <a href="/upload" className="flex items-center">
              <img src="/logo.webp" alt="Sherlocked" className="h-10 w-auto object-contain" />
            </a>
            <div className="flex items-center gap-2 text-[#1A1D27]">
              <a href="/admin" aria-label="הגדרות מנהל" className="hover:text-teal hover:bg-teal/10 p-2 rounded-full transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </a>
              <a href="/history" aria-label="היסטוריה" className="hover:text-teal hover:bg-teal/10 p-2 rounded-full transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
              </a>
            </div>
          </header>

          <main className="flex-1 flex flex-col p-6 isolate">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}
