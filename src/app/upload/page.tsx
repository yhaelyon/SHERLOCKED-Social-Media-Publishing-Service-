"use client";

import { useState, useRef } from 'react';
import { Image as ImageIcon, Video as VideoIcon, UploadCloud, XCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

type Step = 'UPLOAD' | 'PUBLISHING' | 'DONE';

interface PublishResult {
  igFeed: boolean | string;
  igStory: boolean | string;
  fbFeed: boolean | string;
  fbStory: boolean | string;
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>('UPLOAD');
  
  // File State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ url: string; type: string; name: string } | null>(null);
  
  // Publishing State
  const [pubStatus, setPubStatus] = useState({
    caption: 'pending', // pending, loading, done
    publish: 'pending', // pending, loading, done
  });
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const [publishResults, setPublishResults] = useState<PublishResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!fileData) return;
    setStep('PUBLISHING');
    
    // Step 1: Generate AI Caption
    setPubStatus(s => ({ ...s, caption: 'loading' }));
    let finalCaption = '';
    let currPostIndex = 1;
    
    try {
      const capRes = await fetch('/api/caption', { method: 'POST' });
      const capData = await capRes.json();
      if (!capRes.ok) throw new Error(capData.error || 'Caption failed');
      finalCaption = capData.caption;
      currPostIndex = capData.postIndex;
    } catch (err) {
      console.warn("AI Caption failed. Using fallback:", err);
      // Fallback if Anthropic runs out of credits during testing
      finalCaption = "חוויית חדר בריחה מושלמת לכל המשפחה! שרלוקד - לא מה שחשבתם 🕵️‍♂️🔐 #שרלוקד #חדרבריחה #רישוןלציון";
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
          targets: ['fb_feed', 'fb_story', 'ig_feed', 'ig_story']
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
    <div className="flex flex-col gap-6 flex-1">
      <header>
        <h2 className="text-2xl font-bold text-primary">העלאת תוכן חדש</h2>
        <p className="text-secondary text-sm mt-1">בחר קבצים להעלאה ולפרסום ברשתות</p>
      </header>

      {/* SCREEN 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <>
          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red flex items-start gap-3 p-4 rounded-xl">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{uploadError}</p>
            </div>
          )}

          {fileData ? (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500 w-5 h-5" />
                  <span className="text-sm font-medium text-green-500">הקובץ מוכן לפרסום!</span>
                </div>
                <button 
                  onClick={() => setFileData(null)}
                  className="text-xs border border-green-500/20 text-green-500 px-3 py-1.5 rounded-full hover:bg-green-500/10 transition-colors"
                >
                  החלף קובץ
                </button>
              </div>
              
              <div className="bg-elevated rounded-xl border border-border-subtle overflow-hidden">
                <div className="aspect-square bg-base w-full flex items-center justify-center relative border-b border-border-subtle">
                  {fileData.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileData.url} alt="Preview" className="object-contain w-full h-full" />
                  ) : (
                    <video src={fileData.url} controls className="w-full h-full object-contain" />
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <p className="text-primary font-medium truncate" dir="ltr">{fileData.name}</p>
                  <p className="text-secondary text-xs">
                    {fileData.type === 'image' ? "תמונה" : "וידאו"} מוכן לשילוח למטא
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handlePublishNow}
                className="bg-teal hover:bg-teal/90 text-base font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-teal/20 w-full flex items-center justify-center gap-2 group"
              >
                פרסם עכשיו רובוטית 🚀
              </button>
            </div>
          ) : (
            <div 
              onClick={() => !isUploadingFile && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-5 transition-all cursor-pointer group min-h-[400px]
                ${isDragging ? 'border-teal bg-teal/5' : 'border-border-subtle hover:border-border hover:bg-elevated/30'}
                ${isUploadingFile ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={handleFileInput} />
              <div className={`p-5 rounded-full transition-transform shadow-lg ${isDragging ? 'bg-teal text-base scale-110' : 'bg-surface text-teal group-hover:scale-105 group-hover:bg-elevated'}`}>
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="text-center flex flex-col items-center">
                {isUploadingFile ? (
                  <>
                    <Loader2 className="w-8 h-8 text-teal animate-spin mb-3" />
                    <p className="text-primary font-medium text-lg">מעלה למאגר...</p>
                  </>
                ) : (
                  <>
                    <p className="text-primary font-medium text-lg">לחץ או גרור קובץ</p>
                    <div className="flex items-center gap-3 mt-3 text-secondary text-sm">
                      <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> תמונה</span>
                      <span className="text-border-subtle">•</span>
                      <span className="flex items-center gap-1.5"><VideoIcon className="w-4 h-4" /> וידאו</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* SCREEN 2: PUBLISHING (AUTO) */}
      {step === 'PUBLISHING' && (
        <div className="flex-1 flex flex-col bg-elevated rounded-xl border border-border-subtle p-6 animate-in fade-in duration-300">
          <div className="text-center mb-8">
            <Loader2 className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary">מפרסם...</h3>
            <p className="text-secondary text-sm mt-1">נא לא לסגור את האפליקציה</p>
          </div>

          <div className="flex flex-col gap-5 bg-surface p-5 rounded-xl border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-primary flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-teal" /> הועלה למאגר
              </span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-3 ${pubStatus.caption === 'pending' ? 'text-secondary' : 'text-primary'}`}>
                <span className="text-xl w-5 text-center">🤖</span> יוצר כיתוב אוטומטי
              </span>
              {pubStatus.caption === 'loading' && <Loader2 className="w-5 h-5 text-teal animate-spin" />}
              {pubStatus.caption === 'done' && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>

            <div className="border-t border-border-subtle my-1"></div>

            <div className={`transition-opacity ${pubStatus.publish === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
              <div className="flex flex-col gap-4">
                <span className="text-primary font-bold text-sm">שולח למטא... (Instagram & Facebook)</span>
                
                {['Instagram Feed', 'Instagram Story', 'Facebook Feed', 'Facebook Story'].map((target, i) => (
                  <div key={i} className="flex items-center justify-between pl-2">
                    <span className="text-secondary text-sm">{target}</span>
                    {pubStatus.publish === 'loading' && <Loader2 className="w-4 h-4 text-secondary animate-spin" />}
                    {pubStatus.publish === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: DONE */}
      {step === 'DONE' && publishResults && (
        <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-elevated rounded-xl border border-border-subtle p-6 text-center shadow-lg shadow-green-500/5">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-primary mb-2">פורסם בהצלחה!</h3>
            <p className="text-secondary text-sm">התוכן שלך הופץ אוטומטית לכל הערוצים.</p>
          </div>

          <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
            <div className="p-4 bg-elevated border-b border-border-subtle">
              <h4 className="font-bold text-primary text-sm flex items-center gap-2">
                <span className="text-lg">🤖</span> הכיתוב שנוצר ונשלח:
              </h4>
            </div>
            <div className="p-4 text-primary whitespace-pre-wrap text-sm leading-relaxed border-b border-border-subtle bg-base">
              {generatedCaption}
            </div>

            <div className="p-4 flex flex-col gap-3">
              {[
                { label: 'Instagram Feed', success: publishResults.igFeed === true, error: typeof publishResults.igFeed === 'string' ? publishResults.igFeed : null },
                { label: 'Instagram Story', success: publishResults.igStory === true, error: typeof publishResults.igStory === 'string' ? publishResults.igStory : null },
                { label: 'Facebook Feed', success: publishResults.fbFeed === true, error: typeof publishResults.fbFeed === 'string' ? publishResults.fbFeed : null },
                { label: 'Facebook Story', success: publishResults.fbStory === true, error: typeof publishResults.fbStory === 'string' ? publishResults.fbStory : null },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary">{item.label}</span>
                  {item.success ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                      <CheckCircle className="w-3.5 h-3.5" /> תקין
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red bg-red/10 px-2.5 py-1 rounded max-w-[150px] truncate" title={item.error || 'שגיאה'}>
                      <XCircle className="w-3.5 h-3.5" /> שגיאה
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={resetFlow}
            className="flex items-center justify-center gap-2 bg-elevated border border-border text-primary hover:bg-border-subtle font-bold py-3.5 rounded-lg transition-all w-full"
          >
            <RefreshCw className="w-5 h-5" /> פרסם תמונה נוספת
          </button>
        </div>
      )}
    </div>
  );
}
