# SHERLOCKED — Social Media Publishing Service
## Antigravity AI Build Prompt | Standalone Service | v1.0

---

> **READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.**
> This is a standalone service — separate from the Sherlocked ERP.
> It will later be merged into the ERP, but for now build it independently.

---

## WHAT WE ARE BUILDING

A web application where Sherlocked escape room employees can:
1. Upload a photo or video from their phone browser
2. AI automatically generates a Hebrew caption
3. System immediately publishes to Instagram + Facebook (feed + stories)

No editing. No approval step. Upload → AI caption → publish automatically.

---

## BUILD ORDER — DO NOT SKIP STEPS

```
Phase 0  → Environment (Railway, Supabase, Meta API keys)
Phase 1  → UI Shells (all pages, Hebrew, dark theme)
Phase 2  → File upload + Supabase Storage
Phase 3  → Claude AI caption generation
Phase 4  → Instagram publishing (photo → video → stories)
Phase 5  → Facebook publishing (photo → video → stories)
Phase 6  → Post history + admin settings page
```

**Stop after each phase. Show the result. Wait for approval. Then continue.**

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 App Router + Tailwind | Hebrew RTL, dark theme |
| Backend | Fastify API | REST endpoints |
| Database | Supabase (PostgreSQL) | post tracking, auth, token storage |
| File Storage | Supabase Storage | temporary + archive |
| AI Captions | Claude API (claude-sonnet-4-5) | Hebrew caption generation |
| Publishing | Meta Graph API | Instagram + Facebook direct |
| Hosting | Railway.app | single project, 2 services |
| Auth | Supabase Auth | employee login (email + password) |

---

## DESIGN SYSTEM — DARK THEME (MANDATORY)

```css
--bg-base:       #0F1117;
--bg-surface:    #1A1D27;
--bg-elevated:   #22253A;
--bg-hover:      #2A2D3E;
--border:        #2E3150;
--text-primary:  #E8EAFF;
--text-secondary:#8B8FA8;
--accent-teal:   #00C4AA;
--accent-red:    #EF4444;
--accent-green:  #10B981;
--accent-amber:  #F59E0B;
--accent-purple: #8B5CF6;
```

- Font: Heebo (Hebrew) + Inter (numbers)
- Direction: RTL everywhere (`<html dir="rtl" lang="he">`)
- All text in Hebrew
- Rounded corners: 8px cards, 6px inputs
- Mobile-first — employees upload from phones

---

## PHASE 0 — ENVIRONMENT SETUP

### Railway Project Structure

```
Railway Project: sherlocked-social
├── Service 1: web    (Next.js frontend + Fastify API together)
└── Service 2: —      (no extra services needed for this standalone app)

Supabase Storage Bucket: "social-posts" (public)
```

### Railway Environment Variables

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Meta Graph API
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=              # long-lived token (60 days)
META_INSTAGRAM_ID=              # Instagram Business Account ID
META_FACEBOOK_PAGE_ID=          # Facebook Page ID

# Claude AI
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=            # Railway public URL
```

---

## DATABASE SCHEMA

### Migration 001 — Core Tables

```sql
-- Track every post attempt
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id),
  file_url TEXT NOT NULL,           -- Supabase Storage public URL
  file_type TEXT NOT NULL,          -- 'image' | 'video'
  caption TEXT NOT NULL,            -- AI-generated Hebrew caption
  post_index INT NOT NULL,          -- 1-5 (5 = call to action)

  -- Publishing status per platform
  ig_feed_status TEXT DEFAULT 'pending',    -- pending|published|failed
  ig_feed_media_id TEXT,
  ig_story_status TEXT DEFAULT 'pending',
  ig_story_media_id TEXT,
  fb_feed_status TEXT DEFAULT 'pending',
  fb_feed_post_id TEXT,
  fb_story_status TEXT DEFAULT 'pending',
  fb_story_media_id TEXT,

  -- Error tracking
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Global post counter (for post_index cycling 1→2→3→4→5→1...)
CREATE TABLE post_counter (
  id INT PRIMARY KEY DEFAULT 1,
  total_count INT DEFAULT 0
);
INSERT INTO post_counter VALUES (1, 0);

-- Store Meta access token securely
CREATE TABLE social_connections (
  id INT PRIMARY KEY DEFAULT 1,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  instagram_id TEXT,
  facebook_page_id TEXT,
  last_verified_at TIMESTAMPTZ,
  status TEXT DEFAULT 'connected'   -- connected|disconnected|expired
);

-- Employee profiles (extends Supabase auth)
CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'staff'   -- staff | admin
);
```

### Migration 002 — Auto Token Renewal (pg_cron)

```sql
-- Runs every day at 08:00 to check token expiry
SELECT cron.schedule(
  'check-meta-token',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.api_url') || '/api/meta/renew-token',
      headers := '{"Content-Type": "application/json"}'::jsonb
    )
    WHERE EXISTS (
      SELECT 1 FROM social_connections
      WHERE token_expires_at < now() + interval '10 days'
    );
  $$
);
```

**SEED:**
```sql
INSERT INTO social_connections (id) VALUES (1);
```

---

## PHASE 1 — UI SHELLS

### Pages to Build

```
/              → redirect to /upload if logged in, else /login
/login         → employee login page
/upload        → main upload page (most used)
/history       → post history list
/admin         → admin settings (admin role only)
/admin/social  → Meta API connection settings
```

### Mobile-First Layout

```
Top bar: SHERLOCKED logo (teal) | [history icon] | [logout icon]
Main content: centered, max-width 480px on desktop, full width mobile
No sidebar needed — this is a simple single-purpose app
```

---

## PHASE 2 — FILE UPLOAD

### Upload Page (`/upload`)

```
┌─────────────────────────────────┐
│    📸 העלאת תמונה / וידאו       │
│                                  │
│  ┌───────────────────────────┐   │
│  │                           │   │
│  │   לחץ לבחירת קובץ        │   │
│  │   או גרור לכאן            │   │
│  │                           │   │
│  │   📷 תמונה או 🎥 וידאו   │   │
│  └───────────────────────────┘   │
│                                  │
│  [בחר מהגלריה]  [צלם עכשיו]    │
│                                  │
│  formats: JPG, PNG, MP4, MOV    │
│  max size: 100MB                 │
└─────────────────────────────────┘
```

### File Validation Rules

```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov'];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;   // 8MB (Instagram limit)
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Instagram video requirements:
// - Duration: 3 seconds to 60 seconds (feed), up to 60s (stories)
// - Aspect ratio: 4:5 (feed), 9:16 (stories)
// - Format: MP4 or MOV
```

### Upload API Endpoint

```
POST /api/upload
Content-Type: multipart/form-data
Body: { file: File }

Flow:
1. Validate file type and size
2. Generate unique filename: posts/{userId}/{timestamp}-{uuid}.{ext}
3. Upload to Supabase Storage bucket "social-posts"
4. Get public URL from Supabase
5. Return { fileUrl, fileType, fileName }

Response:
{
  "fileUrl": "https://xyz.supabase.co/storage/v1/object/public/social-posts/...",
  "fileType": "image" | "video",
  "uploadedAt": "2026-03-29T..."
}
```

---

## PHASE 3 — AI CAPTION GENERATION

### Caption Logic

```typescript
// Get current post_index (cycles 1→2→3→4→5→1→2→3→4→5...)
async function getNextPostIndex(): Promise<number> {
  const { data } = await supabase
    .from('post_counter')
    .select('total_count')
    .single();

  const newCount = (data.total_count || 0) + 1;
  const postIndex = (newCount % 5) === 0 ? 5 : (newCount % 5);

  await supabase
    .from('post_counter')
    .update({ total_count: newCount })
    .eq('id', 1);

  return postIndex;
}
```

### Claude API Call — Caption Generation

```typescript
async function generateCaption(postIndex: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: buildCaptionPrompt(postIndex)
      }]
    })
  });

  const data = await response.json();
  return data.content[0].text.trim();
}

function buildCaptionPrompt(postIndex: number): string {
  return `You are a marketing expert for an escape room business in Israel with 10 years of experience.

Business name: Sherlocked
Location: Rishon LeZion

Write a short and catchy caption in Hebrew for Instagram and Facebook.

Goals:
- attract families with kids
- attract birthday events
- attract groups of friends

Tone:
exciting, fun, mysterious, energetic

Input:
post_index = ${postIndex}

Instructions:
- Hebrew only
- 1 short sentence
- Add emojis
- Add 5 relevant hashtags in Hebrew

Rules:

If post_index = 5:
- Add a strong call to action (הזמינו עכשיו / נשארו מקומות בודדים / מהרו להזמין)
- Create urgency

If post_index is 1–4:
- DO NOT include any call to action
- Focus on fun, excitement, success, and experience

Output:
Caption only`;
}
```

### Caption API Endpoint

```
POST /api/caption
Body: { postIndex: number }

Response:
{
  "caption": "🔐 כשהמשפחה מתאחדת לפתור תעלומות ביחד — הקסם מתחיל! #שרלוקד #חדרבריחה #משפחה #ריאשוןלציון #חוויה",
  "postIndex": 3
}
```

---

## PHASE 4 — PUBLISHING FLOW (FULL AUTOMATIC)

### Master Publishing Endpoint

```
POST /api/publish
Body: {
  fileUrl: string,
  fileType: 'image' | 'video',
  caption: string,
  postIndex: number,
  targets: ['ig_feed', 'ig_story', 'fb_feed', 'fb_story']
}
```

```typescript
async function publishToAll(params: PublishParams): Promise<PublishResult> {
  // Create post record in DB first
  const post = await createPostRecord(params);

  // Run all platform calls in parallel
  const [igFeed, igStory, fbFeed, fbStory] = await Promise.allSettled([
    publishToInstagramFeed(post),
    publishToInstagramStory(post),
    publishToFacebookFeed(post),
    publishToFacebookStory(post),
  ]);

  // Update DB with results
  await updatePostResults(post.id, { igFeed, igStory, fbFeed, fbStory });

  return buildResult(igFeed, igStory, fbFeed, fbStory);
}
```

---

### 4A — Instagram Feed (Photo)

```typescript
async function publishInstagramFeedPhoto(fileUrl: string, caption: string): Promise<string> {
  const token = await getAccessToken();
  const igId = process.env.META_INSTAGRAM_ID;

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: fileUrl,
        caption: caption,
        access_token: token
      })
    }
  );
  const { id: containerId } = await containerRes.json();

  // Step 2: Wait for container to be ready (poll every 2 seconds, max 30s)
  await pollUntilReady(containerId, token);

  // Step 3: Publish
  const publishRes = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token
      })
    }
  );
  const { id: mediaId } = await publishRes.json();
  return mediaId;
}

async function pollUntilReady(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    const res = await fetch(
      `https://graph.instagram.com/v25.0/${containerId}?fields=status_code&access_token=${token}`
    );
    const { status_code } = await res.json();
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR') throw new Error('Instagram container processing failed');
  }
  throw new Error('Instagram container timeout');
}
```

---

### 4B — Instagram Feed (Video / Reel)

```typescript
async function publishInstagramFeedVideo(fileUrl: string, caption: string): Promise<string> {
  const token = await getAccessToken();
  const igId = process.env.META_INSTAGRAM_ID;

  // Step 1: Create video container
  const containerRes = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: fileUrl,
        media_type: 'REELS',
        caption: caption,
        access_token: token
      })
    }
  );
  const { id: containerId } = await containerRes.json();

  // Step 2: Poll — videos take longer (up to 5 minutes for large files)
  await pollUntilReady(containerId, token, { maxAttempts: 90, intervalMs: 3000 });

  // Step 3: Publish
  const publishRes = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: token })
    }
  );
  const { id: mediaId } = await publishRes.json();
  return mediaId;
}
```

---

### 4C — Instagram Story (Photo + Video)

```typescript
async function publishInstagramStory(fileUrl: string, fileType: 'image' | 'video'): Promise<string> {
  const token = await getAccessToken();
  const igId = process.env.META_INSTAGRAM_ID;

  const body: any = {
    media_type: 'STORIES',
    access_token: token
  };

  if (fileType === 'image') {
    body.image_url = fileUrl;
  } else {
    body.video_url = fileUrl;
  }

  // Step 1: Create container
  const containerRes = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  const { id: containerId } = await containerRes.json();

  // Step 2: Poll until ready
  await pollUntilReady(containerId, token, {
    maxAttempts: fileType === 'video' ? 90 : 15,
    intervalMs: fileType === 'video' ? 3000 : 2000
  });

  // Step 3: Publish story
  const publishRes = await fetch(
    `https://graph.instagram.com/v25.0/${igId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: token })
    }
  );
  const { id: mediaId } = await publishRes.json();
  return mediaId;
}
```

---

### 4D — Facebook Feed (Photo)

```typescript
async function publishFacebookFeedPhoto(fileUrl: string, caption: string): Promise<string> {
  const token = await getAccessToken();
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${pageId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: fileUrl,
        message: caption,
        access_token: token
      })
    }
  );
  const { id: postId } = await res.json();
  return postId;
}
```

---

### 4E — Facebook Feed (Video)

```typescript
async function publishFacebookFeedVideo(fileUrl: string, caption: string): Promise<string> {
  const token = await getAccessToken();
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${pageId}/videos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: fileUrl,
        description: caption,
        access_token: token
      })
    }
  );
  const { id: postId } = await res.json();
  return postId;
}
```

---

### 4F — Facebook Story (Photo + Video)

```typescript
async function publishFacebookStory(fileUrl: string, fileType: 'image' | 'video'): Promise<string> {
  const token = await getAccessToken();
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  // Step 1: Create media for story
  const endpoint = fileType === 'image'
    ? `https://graph.facebook.com/v25.0/${pageId}/photo_stories`
    : `https://graph.facebook.com/v25.0/${pageId}/video_stories`;

  const body: any = { access_token: token };
  if (fileType === 'image') {
    body.photo_id = await uploadPhotoForStory(fileUrl, token, pageId);
  } else {
    body.video_id = await uploadVideoForStory(fileUrl, token, pageId);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const { id } = await res.json();
  return id;
}

async function uploadPhotoForStory(fileUrl: string, token: string, pageId: string): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${pageId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: fileUrl,
        published: false,    // upload without publishing to feed
        access_token: token
      })
    }
  );
  const { id } = await res.json();
  return id;
}
```

---

## PHASE 5 — PUBLISHING UI

### Upload → Publishing Flow (Single Page)

```
SCREEN 1 — Upload:
┌───────────────────────────┐
│  📸 העלאת תמונה / וידאו   │
│                            │
│  [drop zone / file picker] │
│  [בחר מהגלריה]            │
│                            │
│  File selected:            │
│  photo.jpg (2.3MB) ✅      │
│                            │
│  [פרסם עכשיו] ←──────────┐│
└───────────────────────────┘

↓ Employee clicks "פרסם עכשיו"

SCREEN 2 — Publishing (auto, no interaction):
┌───────────────────────────┐
│  🚀 מפרסם...               │
│                            │
│  ⬆️ מעלה קובץ...  ✅       │
│  🤖 יוצר כיתוב...  ✅      │
│  📱 Instagram...   ⏳       │
│     Feed          ⏳        │
│     Story         ⏳        │
│  📘 Facebook...    ⏳       │
│     Feed          ⏳        │
│     Story         ⏳        │
└───────────────────────────┘

↓ ~10-15 seconds later

SCREEN 3 — Done:
┌───────────────────────────┐
│  ✅ פורסם בהצלחה!          │
│                            │
│  📱 Instagram Feed   ✅    │
│  📱 Instagram Story  ✅    │
│  📘 Facebook Feed    ✅    │
│  📘 Facebook Story   ✅    │
│                            │
│  הכיתוב שנשלח:            │
│  "🔐 כשהמשפחה מתאחדת..."  │
│                            │
│  [פרסם תמונה נוספת]       │
└───────────────────────────┘

↓ If any platform fails:
┌───────────────────────────┐
│  ⚠️ פורסם עם שגיאות        │
│                            │
│  📱 Instagram Feed   ✅    │
│  📱 Instagram Story  ❌    │  ← with error reason
│  📘 Facebook Feed    ✅    │
│  📘 Facebook Story   ✅    │
│                            │
│  [נסה שוב] [פרסם חדש]    │
└───────────────────────────┘
```

---

## PHASE 6 — HISTORY + ADMIN SETTINGS

### Post History (`/history`)

```
Filter: הכל | תמונות | וידאו | היום | השבוע

Each post card:
┌───────────────────────────────┐
│ [thumbnail]  📸 23/03/2026    │
│              by: David K.     │
│              "🔐 כשהמשפחה..." │
│                               │
│ 📱 IG Feed ✅  📱 Story ✅    │
│ 📘 FB Feed ✅  📘 Story ✅    │
└───────────────────────────────┘
```

### Admin Settings (`/admin/social`)

```
┌───────────────────────────────────────────┐
│  📱 Instagram                              │
│  ● מחובר ✅                               │
│  Account ID: 17841234567890               │
│  Token expires: 45 days                   │
│  Last post: 23/03/2026                    │
│  [בדוק חיבור]  [חדש Token]               │
├───────────────────────────────────────────┤
│  📘 Facebook                               │
│  ● מחובר ✅                               │
│  Page: Sherlocked Escape Rooms            │
│  Page ID: 123456789012345                 │
│  Token expires: 45 days                   │
│  Last post: 23/03/2026                    │
│  [בדוק חיבור]  [חדש Token]               │
├───────────────────────────────────────────┤
│  📊 סטטיסטיקות                            │
│  סה"כ פוסטים: 47                         │
│  השבוע: 8                                 │
│  Counter נוכחי: 3/5                       │
└───────────────────────────────────────────┘
```

### Token Management API

```typescript
// Test connection
GET /api/meta/test
→ calls graph.instagram.com/me with current token
→ returns { instagram: ok|error, facebook: ok|error, expiresAt }

// Renew token
POST /api/meta/renew-token
→ exchanges current token for new 60-day token
→ updates social_connections table
→ returns { newExpiresAt }

// Manual token update (admin enters new token from Meta)
POST /api/meta/update-token
Body: { accessToken: string }
→ validates token first
→ saves if valid
```

---

## ERROR HANDLING

### Retry Logic

```typescript
async function publishWithRetry<T>(
  fn: () => Promise<T>,
  platform: string,
  maxRetries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`${platform} failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      await sleep(2000 * (attempt + 1)); // exponential backoff
    }
  }
  throw new Error('Unreachable');
}
```

### Common Meta API Errors

```
Error 190 → token expired → trigger renewal + alert admin
Error 100 → invalid parameter → log details, mark post as failed
Error 368 → account blocked temporarily → wait 1 hour, retry
Error 10  → permission missing → alert admin to check Meta app settings
```

---

## FILE CLEANUP (Optional but recommended)

```typescript
// Supabase pg_cron: delete files older than 7 days
SELECT cron.schedule(
  'cleanup-old-files',
  '0 3 * * *',  -- 3am every day
  $$
    DELETE FROM posts
    WHERE created_at < now() - interval '7 days'
    AND ig_feed_status = 'published'
    AND fb_feed_status = 'published';
    -- Note: also delete from Supabase Storage via Edge Function
  $$
);
```

---

## REQUIRED META APP PERMISSIONS

When setting up the Meta Developer App, request these permissions:

```
instagram_business_basic
instagram_business_content_publish
pages_manage_posts
pages_read_engagement
pages_show_list
business_management
```

**Important:** Since this app only posts to YOUR OWN accounts, you do NOT need to go through Meta App Review. Development mode is sufficient.

---

## ONE-TIME SETUP CHECKLIST (done by business owner, not developer)

```
[ ] 1. Go to developers.facebook.com → Create App → type "Business"
[ ] 2. Add all 6 permissions listed above
[ ] 3. Go to Meta Business Suite → link Instagram to Facebook Page
[ ] 4. Use Graph API Explorer to generate short-lived token
[ ] 5. Exchange for long-lived token (60 days) via API call
[ ] 6. GET /me/accounts to find Facebook Page ID
[ ] 7. GET graph.instagram.com/me to find Instagram Business ID
[ ] 8. Add all 5 values to Railway environment variables
[ ] 9. Click "Test Connection" in admin settings → confirm ✅
```

---

## LATER — MERGING INTO SHERLOCKED ERP

When ready to merge this into the main ERP system:

```
1. Move all DB tables to ERP Supabase instance
   (posts, post_counter, social_connections)

2. Move API routes into ERP Fastify API
   (/api/upload, /api/caption, /api/publish, /api/meta/*)

3. Move UI pages into ERP Next.js app
   Dashboard route: /dashboard/social
   Admin route: /dashboard/admin/social-media

4. Reuse existing ERP auth (employee login already exists)

5. Delete this standalone Railway service after merge confirmed
```

---

## SEND THIS TO ANTIGRAVITY TO START

```
I'm building a standalone social media publishing service for Sherlocked, 
an escape room business in Israel.

All specifications are in the file: SHERLOCKED_SOCIAL_PROMPT.md

Read the ENTIRE file before writing any code.

Start with Phase 0 only:
- Create the Railway project structure
- Set up Supabase with the 2 migrations
- Confirm all environment variables are in place
- Show me the running empty app before continuing

Rules:
- Dark theme for all UI (CSS variables are defined in the file)
- Hebrew only, RTL
- Font: Heebo
- Mobile-first design (employees use phones)
- Stop after Phase 0 and wait for my approval before continuing
```

---

*Sherlocked Social Publishing Service v1.0*
*Standalone → will merge into Sherlocked ERP after launch*


---

## PHASE 0 ADDITION — META CONNECTION VERIFICATION

### Immediately After Setting Railway Variables

Build a simple test endpoint FIRST, before any other code:

```
GET /api/meta/test
```

```typescript
// api/meta/test.ts
export async function testMetaConnection() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ID;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  const [igResult, fbResult] = await Promise.allSettled([
    fetch(`https://graph.instagram.com/v25.0/${igId}?fields=username,account_type&access_token=${token}`),
    fetch(`https://graph.facebook.com/v25.0/${pageId}?fields=name,id&access_token=${token}`)
  ]);

  const igData = igResult.status === 'fulfilled' ? await igResult.value.json() : null;
  const fbData = fbResult.status === 'fulfilled' ? await fbResult.value.json() : null;

  // Get token expiry
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`
  );
  const debugData = await debugRes.json();
  const expiresAt = debugData?.data?.expires_at
    ? new Date(debugData.data.expires_at * 1000)
    : null;

  return {
    instagram: {
      ok: !igData?.error,
      username: igData?.username,
      accountType: igData?.account_type,
      error: igData?.error?.message
    },
    facebook: {
      ok: !fbData?.error,
      pageName: fbData?.name,
      pageId: fbData?.id,
      error: fbData?.error?.message
    },
    token: {
      expiresAt,
      daysRemaining: expiresAt
        ? Math.floor((expiresAt.getTime() - Date.now()) / 86400000)
        : null
    }
  };
}
```

This endpoint is called:
- On page load of /admin/social
- When employee clicks [Test Connection]
- Automatically every 24h via pg_cron to update status in DB

---

## PHASE 6 FULL SPECIFICATION — SETTINGS + STATUS + WEBHOOKS

### 6A — Admin Settings Page (`/admin/social`)

```typescript
// Components on this page:

// 1. Connection card per platform (Instagram + Facebook)
// 2. Webhook status card
// 3. Token expiry with color coding
// 4. Action buttons

// Token expiry color logic:
function getExpiryColor(daysRemaining: number): string {
  if (daysRemaining > 47) return '#10B981'; // green
  if (daysRemaining > 10) return '#F59E0B'; // amber
  return '#EF4444';                          // red
}

// Auto-refresh connection status every 60 seconds on this page
```

### Settings Page Full UI Spec

```
Route: /admin/social
Access: admin role only (check employee_profiles.role === 'admin')

Layout: two cards side by side on desktop, stacked on mobile

CARD 1 — INSTAGRAM:
  Header: "📱 Instagram" + status badge (CONNECTED ✅ / DISCONNECTED ❌)
  Fields shown:
    Account: @{username}
    Account ID: {igId}
    Token: [hidden — show first 8 chars + ...]
    Expires: {date} ({n} days remaining) [colored]
    Last successful post: {date + time}
    Webhooks: Receiving ✅ / Not configured ❌
  Buttons:
    [בדוק חיבור] → calls GET /api/meta/test → updates card live
    [חדש Token]  → calls POST /api/meta/renew-token
    [ערוך Token] → opens modal to paste new token manually

CARD 2 — FACEBOOK:
  Same structure as Instagram card

CARD 3 — WEBHOOK ENDPOINT:
  URL: https://{RAILWAY_URL}/api/meta/webhook  [copyable]
  Verify Token: {WEBHOOK_VERIFY_TOKEN}          [copyable]
  Status: Active ✅ / Not verified ❌
  Last event received: {timestamp}
  Events today: {count}
  [Copy URL] [Test Webhook]

CARD 4 — STATISTICS:
  Total posts published: {n}
  This week: {n}
  Post counter: {current}/5 (next CTA post in {n} posts)
  Success rate: {%}
```

### 6B — Token Renewal API

```typescript
// POST /api/meta/renew-token
export async function renewToken() {
  const currentToken = await getTokenFromDB();
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  // Exchange current token for new long-lived token
  const res = await fetch(
    `https://graph.facebook.com/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${currentToken}`
  );

  const { access_token: newToken, expires_in } = await res.json();

  if (!newToken) throw new Error('Token renewal failed');

  const expiresAt = new Date(Date.now() + expires_in * 1000);

  // Save new token to Supabase
  await supabase
    .from('social_connections')
    .update({
      access_token: newToken,
      token_expires_at: expiresAt,
      last_verified_at: new Date()
    })
    .eq('id', 1);

  // Update Railway env var via Railway API (optional)
  // This keeps the env var in sync

  return { expiresAt, daysRemaining: Math.floor(expires_in / 86400) };
}
```

### 6C — Webhook Receiver

```typescript
// POST /api/meta/webhook  ← Meta calls this automatically
// GET  /api/meta/webhook  ← Meta uses this to verify the endpoint (one-time setup)

// VERIFICATION (GET — happens once when you add webhook URL in Meta dashboard)
export async function verifyWebhook(query: { 
  'hub.mode': string;
  'hub.verify_token': string; 
  'hub.challenge': string;
}) {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN; // you define this string
  
  if (
    query['hub.mode'] === 'subscribe' &&
    query['hub.verify_token'] === VERIFY_TOKEN
  ) {
    return query['hub.challenge']; // send back the challenge to confirm
  }
  throw new Error('Webhook verification failed');
}

// RECEIVING EVENTS (POST — Meta calls this after each publish)
export async function receiveWebhook(body: MetaWebhookPayload) {
  // Process each entry in the webhook
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field === 'mentions' || change.field === 'media') {
        const { media_id, status } = change.value;

        if (status === 'PUBLISHED') {
          // Update post status in DB
          await supabase
            .from('posts')
            .update({ ig_feed_status: 'published' })
            .eq('ig_feed_media_id', media_id);
        }

        if (status === 'ERROR') {
          await supabase
            .from('posts')
            .update({
              ig_feed_status: 'failed',
              error_details: change.value
            })
            .eq('ig_feed_media_id', media_id);
        }
      }
    }
  }

  // Log webhook event
  await supabase.from('webhook_events').insert({
    platform: body.object,
    payload: body,
    received_at: new Date()
  });

  return { received: true };
}
```

### Add to Database Schema — Webhook Events Table

```sql
-- Add to Migration 001
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,          -- 'instagram' | 'facebook'
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Keep only last 30 days of webhook events
SELECT cron.schedule(
  'cleanup-webhook-events',
  '0 4 * * *',
  $$ DELETE FROM webhook_events WHERE received_at < now() - interval '30 days'; $$
);
```

### 6D — Webhook Setup Instructions (One-Time, Done by You in Meta Dashboard)

```
After your Railway app is deployed and running:

1. Go to: developers.facebook.com → Your App → Webhooks
2. Click: "Add Subscriptions" → "Instagram"
3. Callback URL: https://your-app.railway.app/api/meta/webhook
4. Verify Token: (any string you choose — save it as WEBHOOK_VERIFY_TOKEN in Railway)
5. Subscribe to fields: "mentions", "media"
6. Click Verify → Meta calls your GET endpoint → returns challenge → verified ✅

Repeat step 2-6 for "Facebook Page" webhooks.
Subscribe to fields: "feed"

After this is done:
- Every time you publish a photo or video, Meta will call your webhook
- Your app updates the post status automatically
- Your history page shows real-time status without manual refresh
```

### 6E — Auto-Renewal Background Job

```sql
-- pg_cron: runs every day at 08:00
-- If token expires in less than 10 days → auto-renew
SELECT cron.schedule(
  'auto-renew-meta-token',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.api_url') || '/api/meta/renew-token',
      headers := '{"Content-Type":"application/json",
                   "Authorization":"Bearer ' || current_setting('app.service_key') || '"}'::jsonb
    )
    WHERE EXISTS (
      SELECT 1 FROM social_connections
      WHERE token_expires_at < now() + interval '10 days'
      AND status = 'connected'
    );
  $$
);
```

---

## UPDATED PHASE BUILD ORDER

```
Phase 0:  Environment + Variables + Test Connection endpoint
          → Verify Meta keys work BEFORE any other code

Phase 1:  UI shells (all pages, Hebrew, dark, mobile-first)

Phase 2:  File upload → Supabase Storage → public URL

Phase 3:  Claude AI caption generation + post_index counter

Phase 4:  Publishing to all 4 destinations
          (IG feed, IG story, FB feed, FB story)

Phase 5:  Publishing UI (3 screens: upload → publishing → result)

Phase 6A: Post history with status per platform
Phase 6B: Admin settings page + Test Connection UI
Phase 6C: Token renewal (manual button + auto background job)
Phase 6D: Webhook receiver endpoint
Phase 6E: Webhook setup in Meta Dashboard (you do this manually once)
Phase 6F: Live status updates in history via webhooks
```

---
