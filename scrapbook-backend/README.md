# TickIT backend

The server behind TickIT, a scrapbooking calendar app. It stores tasks, notes, and photos,
writes monthly and yearly recaps with Gemini, narrates them with ElevenLabs, and serves
shareable recap pages.

Built with Node.js, Express, and MongoDB Atlas.

## Setup

You need Node.js 20 or newer (`node -v` to check).

1. Install the libraries:

```
   cd scrapbook-backend
   npm install
```

2. Copy `.env.example` to `.env` and fill it in. Only `MONGODB_URI` is required to start.
   Get the real `.env` from a teammate privately. **Never commit `.env`.**

3. Start the server:

```
   npm run dev
```

   It restarts automatically when you save a code file (but not `.env`; restart manually for that).
   Open http://localhost:3000/health to check it's running.

### Settings (`.env`)

| Setting | What it's for |
| --- | --- |
| `PORT` | Port to listen on. Default 3000. |
| `PUBLIC_URL` | The server's public address, used to build share links. `http://localhost:3000` locally, your domain once deployed. |
| `MONGODB_URI` | Atlas connection string (Connect → Drivers). Required. |
| `MONGODB_DB` | Database name. Everyone on the team should use the same one. |
| `GEMINI_API_KEY` | From Google AI Studio. Needed for recaps. |
| `GEMINI_MODEL` | Default `gemini-flash-latest`. |
| `ELEVENLABS_API_KEY` | From the ElevenLabs dashboard. Needed for narration and voice lines. |
| `ELEVENLABS_VOICE_ID` | The character's voice. |
| `ELEVENLABS_MODEL` | Default `eleven_multilingual_v2`. Use `eleven_flash_v2_5` if it feels slow. |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the server, restarting on code changes. |
| `npm start` | Runs the server once (for deployment). |
| `npm run seed-demo` | Fills a demo year for device `tickit-demo-device`. Add `-- --recaps` to also make every recap, or `-- --dry-run` to preview. Put photos in `demo-photos/`, named with their month first (`09-shellhacks.jpg`). |
| `npm run voice-lines` | Pre-records the character's voice lines. Use `-- --out ../app/assets/voice` to save straight into the app, or `-- --dry-run` to preview. |

## Connecting from the Expo app

**Server address.** On a real phone, `localhost` means the phone itself. Use the
"On your Wi-Fi" address the server prints when it starts (like `http://192.168.1.25:3000`),
with the phone on the same Wi-Fi. Once deployed, use the public address.

**Device ID.** There are no accounts. On first launch, the app makes a random ID
(8 to 64 letters, numbers, `-` or `_`), saves it on the phone permanently, and sends it
with every request:

```
X-Device-Id: your-saved-id
```

If the ID changes, the user's data seems to vanish, so never regenerate it. For demos,
add a hidden way to switch to `tickit-demo-device`.

**Images and audio.** Use the server address plus the path, and either send the
`X-Device-Id` header or add `?d=your-saved-id` to the URL.

**Errors.** Every error comes back as `{ "error": "A readable message" }` that the app
can show directly.

| Status | Meaning |
| --- | --- |
| 400 | The request was malformed (bad date, missing field). |
| 401 | Missing or invalid device ID. |
| 404 | That thing doesn't exist. |
| 409 | A recap is already being made. Wait a few seconds and load it. |
| 413 | Photo over 8 MB. |
| 502 | Gemini had a problem. Try again. |
| 503 | A needed API key isn't set on the server. |

Dates are always `YYYY-MM-DD`, months `YYYY-MM`, and years `YYYY`.

## API

All routes need the `X-Device-Id` header except `/health` and the public `/r/...` pages.

### Mood board

**`GET /years/:year`**: the year's mood board. `hasMoodBoard: false` means show the setup screen.

```json
{
  "year": "2026",
  "hasMoodBoard": true,
  "moodBoard": {
    "words": ["growth", "friends"],
    "intention": "Say yes to new things.",
    "photoIds": ["66f1a2b3c4d5e6f708192a3b"]
  }
}
```

**`PUT /years/:year/moodboard`**: create or replace it. Up to 12 words and 12 photos.
Upload images first with `POST /photos` using `kind: moodboard`, then send their ids.

```json
{ "words": ["growth", "friends"], "intention": "Say yes to new things.", "photoIds": ["..."] }
```

### Days and tasks

**`GET /days/:date`**: one day. Works for empty days too.

```json
{
  "date": "2026-09-26",
  "note": "Beach after class!",
  "tasks": [
    { "id": "3f2b...", "title": "Finish the backend", "time": "14:30", "done": true, "doneAt": "2026-09-26T18:02:11.000Z" }
  ],
  "photos": [{ "id": "66f1a2b3...", "caption": "Sunset", "takenAt": "2026-09-26T22:10:00.000Z" }],
  "progress": 0.5
}
```

`progress` goes from 0 to 1 and places the character along the day's path.

**`POST /days/:date/tasks`**: add a task. `time` is optional.

```json
{ "title": "Study for exam", "time": "14:30" }
```

**`PATCH /days/:date/tasks/:taskId`**: change `title`, `time`, or `done`. Send `{ "done": true }` to check it off.

**`DELETE /days/:date/tasks/:taskId`**: remove a task.

**`PUT /days/:date/note`**: save the journal note (up to 2000 characters).

```json
{ "note": "Beach after class!" }
```

Every day route returns the full updated day, so the app can animate the character from one response.

### Month calendar

**`GET /months/:month`**: what the calendar grid needs. Days with nothing in them are left out.

```json
{
  "month": "2026-09",
  "days": [
    { "date": "2026-09-26", "coverPhotoId": "66f1a2b3...", "photoCount": 3, "tasksDone": 2, "tasksTotal": 4, "hasNote": true }
  ]
}
```

### Photos

**`POST /photos`**: upload as `multipart/form-data`. Resize to about 1080px wide on the
phone first; recaps fail if photos are too large.

| Field | Value |
| --- | --- |
| `photo` | The image file (JPEG, PNG, WebP, or HEIC, up to 8 MB). |
| `date` | `YYYY-MM-DD` |
| `caption` | Optional, up to 200 characters. |
| `kind` | `journal` (default) adds it to that day. `moodboard` keeps it off the calendar. |

Don't set the `Content-Type` header yourself for this request; let `fetch` set it.

```json
{ "id": "66f1a2b3c4d5e6f708192a3b", "caption": "", "takenAt": "...", "date": "2026-09-26", "kind": "journal" }
```

**`GET /photos/:id`**: the image itself.

**`PATCH /photos/:id`**: change the caption: `{ "caption": "Sunset at the beach" }`

**`DELETE /photos/:id`**: delete it and remove it from its day.

### Recaps

**`POST /recaps/month/:month`** and **`POST /recaps/year/:year`**: make a recap, or return
the saved one. The first time takes 10 to 30 seconds, so show a loading animation and
disable the button. Send `{ "force": true }` to write a fresh one. For the best year
recap, make the monthly ones first.

**`GET /recaps/month/:month`** and **`GET /recaps/year/:year`**: load a recap without
making one. 404 means it hasn't been made yet.

**`GET /recaps`**: every recap for this device, newest first.

```json
{
  "id": "66f2...",
  "period": "month",
  "key": "2026-09",
  "label": "September 2026",
  "status": "ready",
  "story": {
    "title": "Sunsets and Study Sessions",
    "summary": "You balanced your first weeks of classes with beach evenings.",
    "mood": "hopeful",
    "highlights": ["First week of classes", "Beach day with the club"],
    "pages": [{ "photoId": "66f1a2b3...", "date": "2026-09-03", "caption": "Golden hour after class" }],
    "narration": "What a month...",
    "characterLine": "We did it, one sunset at a time!"
  },
  "stats": { "daysJournaled": 12, "tasksDone": 31, "tasksTotal": 38, "photoCount": 17 },
  "audioUrl": "/recaps/66f2.../audio",
  "isPublic": false,
  "shareUrl": null,
  "generatedAt": "2026-09-26T20:31:00.000Z"
}
```

`status` is `generating`, `ready`, or `failed`. `audioUrl` is null if there's no narration.

**`GET /recaps/:id/audio`**: the narration MP3. Play it with `expo-audio`.

**`POST /recaps/:id/share`**: turn sharing on. The response includes `shareUrl`; pass it
to React Native's `Share` API. Turning sharing off and on again keeps the same link.

**`DELETE /recaps/:id/share`**: turn sharing off. The link stops working immediately.

### Public share pages (no device ID)

| Route | What it serves |
| --- | --- |
| `GET /r/:shareId` | The scrapbook page friends see. |
| `GET /r/:shareId/photos/:photoId` | Photos on that page (only ones in the recap). |
| `GET /r/:shareId/audio` | The narration. |

Share pages are hidden from search engines, and turning sharing off closes the page, photos, and audio at once.

## Project structure

```
scrapbook-backend/
├── src/
│   ├── index.js          starts the server and connects routes
│   ├── config.js         reads settings from .env
│   ├── db.js             MongoDB connection and file storage
│   ├── validate.js       device ID check and input validation
│   ├── routes/           the URLs the app calls
│   ├── services/         Gemini, ElevenLabs, and the recap builder
│   └── share/page.js     the public scrapbook page
└── scripts/              demo data and voice line tools
```

## Privacy

- Each device only ever sees its own data.
- Photos are sent to Gemini only when a recap is made, and it's instructed not to guess who people are.
- Nothing is public unless the user shares a recap, and sharing can be turned off anytime.