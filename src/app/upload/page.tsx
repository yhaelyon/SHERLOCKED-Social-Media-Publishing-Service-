"use client";

import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Video as VideoIcon, UploadCloud, XCircle, CheckCircle, Loader2, RefreshCw, User, DoorOpen } from 'lucide-react';

type Step = 'UPLOAD' | 'PUBLISHING' | 'DONE';

interface PublishResult {
  igFeed: boolean | string;
  igStory: boolean | string;
  fbFeed: boolean | string;
  fbStory: boolean | string;
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>('UPLOAD');
  
  // Init Data
  const [operators, setOperators] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  // Selection State
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  
  // File State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ url: string; type: string; name: string } | null>(null);
  
  // Publishing State
  const [pubStatus, setPubStatus] = useState({
    caption: 'pending', 
    publish: 'pending', 
  });
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const [publishResults, setPublishResults] = useState<PublishResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/init')
      .then(r => r.json())
      .then(data => {
        setOperators(data.operators);
        setRooms(data.rooms);
      });
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) await processFile(e.dataTransfer.files[0]);
  };
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) await processFile(e.target.files[0]);
  };

  const processFile = async (file: File) => {
    setUploadError(null); setFileData(null); setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'אירעה שגיאה בהעלאת הקובץ.');
      
      setFileData({ url: data.fileUrl, type: data.fileType, name: data.fileName });
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePublishNow = async () => {
    if (!fileData || !selectedOperator || !selectedRoom) {
      setUploadError('אנא בחר מפעיל וחדר לפני הפרסום.');
      return;
    }
    setStep('PUBLISHING');
    
    // Step 1: Generate AI Caption
    setPubStatus(s => ({ ...s, caption: 'loading' }));
    let finalCaption = '';
    let currPostIndex = 1;
    
    try {
      const capRes = await fetch('/api/caption', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: selectedRoom })
      });
      const capData = await capRes.json();
      if (!capRes.ok) throw new Error(capData.error || 'Caption failed');
      finalCaption = capData.caption;
      currPostIndex = capData.postIndex;
    } catch (err) {
      console.warn("AI Caption failed. Using fallback:", err);
      finalCaption = `איזה כיף בחדר ${selectedRoom}! האלופים שלנו פיצחו את הכל! 🕵️‍♂️🔐 #שרלוקד #חדרבריחה`;
    }
    setGeneratedCaption(finalCaption);
    setPubStatus(s => ({ ...s, caption: 'done', publish: 'loading' }));

    // Step 2: Publish to Social
    try {
      const pubRes = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: fileData.url,
          fileType: fileData.type,
          caption: finalCaption,
          postIndex: currPostIndex,
          targets: ['fb_feed', 'fb_story', 'ig_feed', 'ig_story'],
          operatorName: selectedOperator,
          roomName: selectedRoom
        })
      });
      const data = await pubRes.json();
      
      const resObj: PublishResult = { igFeed: false, igStory: false, fbFeed: false, fbStory: false };
      if (data.results) {
        data.results.forEach((r: any) => {
          const isError = r.err ? r.err : false;
          if (r.t === 'ig_feed') resObj.igFeed = isError || true;
          if (r.t === 'ig_story') resObj.igStory = isError || true;
          if (r.t === 'fb_feed') resObj.fbFeed = isError || true;
          if (r.t === 'fb_story') resObj.fbStory = isError || true;
        });
      }
      setPublishResults(resObj);
    } catch (err: any) {
      setPublishResults({ igFeed: err.message, igStory: err.message, fbFeed: err.message, fbStory: err.message });
    }
    
    setPubStatus(s => ({ ...s, publish: 'done' }));
    setStep('DONE');
  };

  const resetFlow = () => {
    setStep('UPLOAD');
    setFileData(null);
    setGeneratedCaption('');
    setPublishResults(null);
    setPubStatus({ caption: 'pending', publish: 'pending' });
  };

  return (
    <div className="flex flex-col gap-6 flex-1 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">העלאת תוכן חדש</h2>
          <p className="text-secondary text-sm mt-1">בחר קבצים להעלאה ולפרסום ברשתות</p>
        </div>
      </header>

      {/* SCREEN 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-4 p-5 rounded-2xl animate-in fade-in zoom-in duration-300">
              <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{uploadError}</p>
            </div>
          )}

          {/* Media Area */}
          <div className="w-full">
            {fileData ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="bg-elevated rounded-3xl border border-border-subtle overflow-hidden shadow-2xl relative group">
                  <div className="aspect-[4/5] bg-base w-full flex items-center justify-center">
                    {fileData.type === 'image' ? (
                      <img src={fileData.url} alt="Preview" className="object-cover w-full h-full" />
                    ) : (
                      <video src={fileData.url} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button 
                    onClick={() => setFileData(null)}
                    className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/80 p-2 rounded-full backdrop-blur-md transition-all text-white border border-white/20 shadow-lg"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => !isUploadingFile && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-6 transition-all cursor-pointer group min-h-[360px] shadow-inner
                  ${isDragging ? 'border-teal bg-teal/5 ring-4 ring-teal/10' : 'border-border-subtle hover:border-teal/40 hover:bg-elevated/50 p-8'}
                  ${isUploadingFile ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={handleFileInput} />
                <div className={`p-6 rounded-full transition-all shadow-xl ${isDragging ? 'bg-teal text-white scale-110' : 'bg-elevated text-teal group-hover:scale-110 group-hover:bg-teal group-hover:text-white'}`}>
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div className="text-center px-4">
                  {isUploadingFile ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-teal animate-spin mb-4" />
                      <p className="text-primary font-bold text-lg">מעבד קובץ...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-primary font-black text-xl mb-3 leading-tight">לחץ או גרור תמונה/וידאו לכאן</p>
                      <div className="flex items-center justify-center gap-2 text-secondary/50 font-bold text-xs uppercase tracking-widest">
                        <span>JPG</span>
                        <span className="w-1 h-1 bg-border-subtle rounded-full"></span>
                        <span>PNG</span>
                        <span className="w-1 h-1 bg-border-subtle rounded-full"></span>
                        <span>MP4</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Area */}
          <div className="flex flex-col gap-5">
            <div className="bg-elevated rounded-2xl p-6 border border-border-subtle shadow-xl flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-secondary/80 flex items-center gap-2 uppercase tracking-tighter">
                  <User className="w-3.5 h-3.5 text-teal" /> מי המפעיל?
                </label>
                <select 
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="bg-base border border-border-subtle rounded-xl px-4 py-3.5 text-primary font-bold focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all appearance-none cursor-pointer"
                >
                  <option value="">בחר מפעיל...</option>
                  {operators.map(op => <option key={op.id} value={op.name}>{op.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-secondary/80 flex items-center gap-2 uppercase tracking-tighter">
                  <DoorOpen className="w-3.5 h-3.5 text-teal" /> איזה חדר שיחקו?
                </label>
                <select 
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="bg-base border border-border-subtle rounded-xl px-4 py-3.5 text-primary font-bold focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal transition-all appearance-none cursor-pointer"
                >
                  <option value="">בחר חדר...</option>
                  <optgroup label="סניף מערב">
                    {rooms.filter(r => r.branch === 'מערב').map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </optgroup>
                  <optgroup label="סניף מזרח">
                    {rooms.filter(r => r.branch === 'מזרח').map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>

            {fileData && (
              <button 
                onClick={handlePublishNow}
                className="bg-teal hover:bg-teal/90 text-white font-black text-xl py-5 rounded-2xl transition-all shadow-xl shadow-teal/30 w-full flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <span>🚀</span>
                <span>שלח לפרסום עכשיו</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 2: PUBLISHING (AUTO) */}
      {step === 'PUBLISHING' && (
        <div className="flex-1 flex flex-col bg-elevated rounded-2xl border border-border-subtle p-12 animate-in fade-in duration-300 shadow-2xl">
          <div className="text-center mb-12">
            <div className="relative inline-block">
                <Loader2 className="w-20 h-20 text-teal animate-spin mx-auto mb-6" />
                <span className="absolute inset-0 flex items-center justify-center text-3xl">🤖</span>
            </div>
            <h3 className="text-3xl font-black text-primary tracking-tight">מפיץ ברשתות...</h3>
            <p className="text-teal font-bold mt-2">הרובוט של שרלוקד עובד בשבילך</p>
          </div>

          <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
            {[
              { id: 'storage', label: 'שומר במאגר היסטוריה', icon: '💾', status: 'done' },
              { id: 'caption', label: 'יוצר כיתוב עם בינה מלאכותית', icon: '✍️', status: pubStatus.caption },
              { id: 'publish', label: 'שולח לפייסבוק ואינסטגרם', icon: '📱', status: pubStatus.publish },
            ].map((item) => (
              <div key={item.id} className={`flex items-center justify-between bg-surface p-5 rounded-2xl border ${item.status === 'pending' ? 'border-border-subtle opacity-40' : 'border-teal/30 shadow-lg shadow-teal/5 transition-all animate-in slide-in-from-left-4'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl w-8 text-center">{item.icon}</span>
                  <span className={`font-bold ${item.status === 'pending' ? 'text-secondary' : 'text-primary'}`}>{item.label}</span>
                </div>
                {item.status === 'loading' && <Loader2 className="w-6 h-6 text-teal animate-spin" />}
                {item.status === 'done' && <CheckCircle className="w-6 h-6 text-green-500 animate-in zoom-in" />}
              </div>
            ))}
          </div>
          
          <p className="text-center text-secondary text-sm mt-12 animate-pulse">נא לא לסגור את הדפדפן עד לסיום הפעולה...</p>
        </div>
      )}

      {/* SCREEN 3: DONE */}
      {step === 'DONE' && publishResults && (
        <div className="flex-1 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-2xl mx-auto w-full pb-12">
          <div className="bg-elevated rounded-3xl border border-border-subtle p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal via-green-500 to-teal"></div>
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-primary mb-3">מעולה! הכל פורסם</h3>
            <p className="text-secondary font-medium">התוכן שלך מופיע עכשיו ברשתות החברתיות של שרלוקד.</p>
          </div>

          <div className="bg-surface rounded-3xl border border-border-subtle overflow-hidden shadow-xl">
            <div className="p-5 bg-elevated/50 border-b border-border-subtle flex items-center justify-between">
              <h4 className="font-black text-primary flex items-center gap-3">
                <span className="text-2xl">🤖</span> הכיתוב שנבחר:
              </h4>
              <span className="text-xs font-bold text-teal bg-teal/10 px-3 py-1 rounded-full uppercase tracking-widest">AI Generated</span>
            </div>
            <div className="p-8 text-primary whitespace-pre-wrap leading-relaxed border-b border-border-subtle bg-base/50 text-right font-medium text-lg">
              {generatedCaption}
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Instagram Feed', success: publishResults.igFeed === true, error: typeof publishResults.igFeed === 'string' ? publishResults.igFeed : null },
                { label: 'Instagram Story', success: publishResults.igStory === true, error: typeof publishResults.igStory === 'string' ? publishResults.igStory : null },
                { label: 'Facebook Feed', success: publishResults.fbFeed === true, error: typeof publishResults.fbFeed === 'string' ? publishResults.fbFeed : null },
                { label: 'Facebook Story', success: publishResults.fbStory === true, error: typeof publishResults.fbStory === 'string' ? publishResults.fbStory : null },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-base/30 p-4 rounded-xl border border-border-subtle/50">
                  <span className="text-sm font-bold text-secondary">{item.label}</span>
                  {item.success ? (
                    <span className="flex items-center gap-2 text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                      <CheckCircle className="w-4 h-4" /> תקין
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-[10px] font-black text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg uppercase tracking-wider max-w-[120px] truncate" title={item.error || 'ERROR'}>
                      <XCircle className="w-4 h-4" /> שגיאה
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={resetFlow}
            className="flex items-center justify-center gap-3 bg-elevated border-2 border-teal/20 text-primary hover:bg-teal hover:text-white hover:border-teal font-black text-lg py-5 rounded-3xl transition-all w-full shadow-2xl active:scale-[0.98]"
          >
            <RefreshCw className="w-6 h-6" /> המשך לפרסום הבא
          </button>
        </div>
      )}
    </div>
  );
}
