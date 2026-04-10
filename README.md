# Agent

A macOS personal AI assistant that lives in a floating pill on your screen. Click the pill to open a full conversation window powered by Claude AI.

---

## Features

- **Floating Pill UI** — Always-on-top pill widget that sits in any corner of your screen
- **AI Conversations** — Powered by Anthropic's Claude with full streaming support
- **Voice Input** — Push-to-talk with OpenAI Whisper transcription
- **Text-to-Speech** — ElevenLabs or system TTS for agent responses
- **Memory** — Persistent memory across conversations; agent remembers context
- **Timers & Alarms** — Set timers and alarms via natural language
- **Clipboard History** — Tracks and searches your clipboard
- **Conversation History** — Browse, load, and delete past conversations
- **Quick Actions** — One-click shortcuts for common tasks
- **System Tools** — File operations, weather, calendar, email, calculations, and more
- **Themes** — Light and dark mode with transparent frosted-glass UI
- **Auth System** — Account creation with email verification, onboarding flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 33 |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Build | electron-vite + Vite |
| AI | Anthropic Claude SDK |
| Database | better-sqlite3 |
| Keychain | keytar (macOS Keychain) |
| State | Zustand |
| Voice | OpenAI Whisper (STT) + ElevenLabs (TTS) |
| Logging | pino |

---

## Requirements

- macOS 12 or later
- Node.js 20+
- npm 9+

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/sungwoonpark0502/agent.git
cd agent
```

### 2. Install dependencies

```bash
npm install
```

> Native modules (`better-sqlite3`, `keytar`) are rebuilt automatically via `postinstall`.

### 3. Run in development

```bash
npm run dev
```

> **Important:** Do not set `ELECTRON_RUN_AS_NODE=1` before running — the dev script clears this automatically. If the app fails to launch, unset it manually:
> ```bash
> unset ELECTRON_RUN_AS_NODE
> npm run dev
> ```

---

## API Keys

API keys are stored securely in the macOS Keychain via `keytar`. Set them in **Settings → Integrations**:

| Key | Purpose |
|---|---|
| Anthropic | Claude AI (required for chat) |
| OpenAI | Whisper speech-to-text |
| ElevenLabs | High-quality TTS voices |
| Weather API | Real-time weather tool |

---

## Project Structure

```
agent/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # App entry point
│   │   ├── windows.ts         # Window management (pill, expanded, fullscreen)
│   │   ├── tray.ts            # Menu bar tray icon
│   │   ├── ipc/
│   │   │   └── handlers.ts    # All IPC handlers
│   │   ├── services/
│   │   │   ├── claude.ts      # Claude AI streaming service
│   │   │   ├── database.ts    # SQLite database
│   │   │   ├── keychain.ts    # Secure key storage
│   │   │   ├── memory.ts      # Persistent memory service
│   │   │   ├── settings.ts    # App settings persistence
│   │   │   ├── timer.ts       # Timer & alarm service
│   │   │   └── voice.ts       # STT / TTS service
│   │   └── tools/
│   │       ├── definitions.ts # Tool schemas for Claude
│   │       └── executor.ts    # Tool execution logic
│   ├── preload/
│   │   └── index.ts           # Context bridge (IPC API)
│   ├── renderer/
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── globals.css
│   │       ├── components/
│   │       │   ├── Auth/      # Login, CreateAccount, Onboarding
│   │       │   ├── Expanded/  # Main chat window
│   │       │   ├── Pill/      # Pill widget states
│   │       │   └── Settings/  # Settings panel tabs
│   │       └── store/         # Zustand state stores
│   └── shared/
│       └── types.ts           # Shared TypeScript types
├── resources/                 # Icons and assets
├── build/                     # Electron builder config
├── tailwind.config.js
├── electron.vite.config.ts
└── package.json
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Build for production |
| `npm run dist` | Package as distributable `.dmg` |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Lint source files |
| `npm test` | Run unit tests |

---

## Building for Distribution

```bash
npm run dist
```

Outputs a signed `.dmg` for both `arm64` (Apple Silicon) and `x64` (Intel) to the `dist/` folder.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Esc` | Minimize to pill |
| `⌘,` | Open settings |
| `⌘⇧F` | Fullscreen mode |

---

## License

MIT
