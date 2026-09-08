# VOICEFORGE STUDIO

**Professional YouTube AI Voice-Over Studio powered by Fish Audio TTS API**

VoiceForge Studio is a production-grade web application designed for content creators, YouTube documentary channels, audio storytellers, and video producers. It turns long YouTube scripts into high-quality speech narration by leveraging Fish Audio's `s2.1-pro-free` (and custom reference) models.

---

## Key Features

- **Smart Speech Chunking Engine**: Automatically splits 5, 10, 20, or 30+ minute YouTube scripts into natural, speech-friendly narration clips (Paragraph → Sentence → Clause → Word logic), preserving dates (e.g. *October 14th*), abbreviations, and quotes.
- **Chapter Auto-Detection**: Recognizes chapter headers (`# INTRODUCTION`, `THE DISCOVERY`, `CHAPTER 1`) and groups clips into structured chapters.
- **Fish Audio Developer API Integration**: Uses official `POST https://api.fish.audio/v1/tts` with secure backend proxy, rate-limiting queueing, and retry backoff handling.
- **Interactive Speech Direction Helper**: Add supported emotion bracket tags like `[whisper]`, `[emphasis]`, `[chuckle]`, and `[pause]`.
- **Individual Clip Control**: Play, pause, scrub, edit text inline, regenerate single clips, or reorder clips with drag-and-drop.
- **Server-Side MP3 Audio Merging**: Seamlessly combines all clips into a single master MP3 with customizable silence gaps (0s to 2.0s).
- **CapCut Ready Export**: Download the merged master MP3 or export a complete ZIP containing all individual MP3 clips + `script.txt`.
- **Zero API Key Exposure**: The Fish Audio API key is securely loaded in server `.env` and never exposed to client-side code.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, `@hello-pangea/dnd`, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Rate Limit, Archiver
- **Audio Processing**: Web Audio API, HTML5 Audio, MP3 Frame Concatenation Engine
- **TTS Engine**: Fish Audio REST API (`https://api.fish.audio/v1/tts` with model `s2.1-pro-free`)

---

## Quick Start & Installation

### 1. Install Dependencies

In the root directory, run:

```bash
npm install
```

This will automatically install dependencies for the root, server, and client.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Open `.env` and set your Fish Audio API Key:

```env
FISH_API_KEY=YOUR_ACTUAL_FISH_AUDIO_API_KEY
PORT=5000
NODE_ENV=development
MAX_CONCURRENT_TTS=2
STORAGE_DIR=./temp_storage
```

> **Where to get a Fish Audio API Key**: Sign up at [https://fish.audio/app/api-keys/](https://fish.audio/app/api-keys/) and generate your developer API key.

---

## Running the Application

Start both the Express backend server (port 5000) and the Vite React frontend (port 3000) concurrently:

```bash
npm run dev
```

Open your browser and navigate to:

```
http://localhost:3000
```

---

## How to Test Fish Audio TTS Connection

1. Open **Settings** in the left sidebar.
2. Click **Test API Connection**.
3. The backend sends a minimal test prompt to Fish Audio and returns:
   - `✓ Fish Audio connection successful! API Key is active.`

---

## How to Add Custom Voice Reference IDs

1. Navigate to **Voice Generator** or the **Voice Selector** in Script Studio.
2. Click **+ Add Custom Reference ID**.
3. Enter a friendly **Voice Name** and paste your cloned Fish Audio model `reference_id` (found in your Fish Audio developer dashboard).
4. Save the voice. It is now instantly available in your studio!

---

## How to Generate a 10-Minute YouTube Voiceover

1. Click **+ New Voiceover** in the sidebar.
2. Navigate to **Script Studio**.
3. Paste your full YouTube script into the text editor.
4. Select a **Script Genre Preset** (e.g. *YouTube Documentary*, *True Crime*, or *Tech*).
5. Click **Analyze Script** to view character count, estimated narration duration, and structure.
6. Select your narrator voice from the Voice Selector.
7. Click **Generate Voiceover** (or **Generate All Clips**).
8. Watch the progress queue as clips are generated with controlled rate limits.
9. Audition individual clips. If a clip needs adjustment, click **Edit Text** → **Save & Update**, or click **Regenerate**.
10. Click **Export Final Voiceover**.
11. Choose your preferred pause duration between clips (e.g., `0.25s` or `0.5s`), then click **MERGE FINAL MP3 VOICEOVER**.
12. Click **Download MP3** or **Download ZIP** and drag your voiceover straight into CapCut!

---

## Running Unit Tests

Run the test suite to verify script chunking, path sanitization, and audio merging:

```bash
npm test
```

---

## Going Live: Deployment Options

### Option 1: 1-Click Free Cloud Deployment on Render (Recommended)
1. Push your repository to GitHub.
2. Log in to [Render](https://render.com) and click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect [`render.yaml`](file:///c:/Users/Muhammad%20Hashim/Desktop/Voice%20generator%20tool/render.yaml).
4. In Environment Variables, enter your `FISH_API_KEY`.
5. Click **Apply**. Render will build and deploy your app with a free public `https://your-app.onrender.com` URL.

### Option 2: Deploy on Railway / Fly.io / VPS
1. **Build command**: `npm install && npm run build`
2. **Start command**: `npm start`
3. **Environment variable**: `FISH_API_KEY=sk-fish-...`

### Option 3: Docker Deployment
Build and run the production container:
```bash
docker build -t voiceforge-studio .
docker run -p 5000:5000 -e FISH_API_KEY="your-api-key" voiceforge-studio
```
Then visit `http://localhost:5000`.

### Option 4: Instant Public URL for Testing (No Cloud Account Needed)
If you want to share your live running local tool instantly via a temporary HTTPS link:
```bash
npx localtunnel --port 3000
```
This gives you a public URL (e.g. `https://hungry-deer-12.loca.lt`) accessible from any browser or phone!
