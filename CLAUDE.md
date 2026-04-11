# CLAUDE.md — Agent Project Guide

This file contains critical context for working on this codebase. Read it fully before making changes.

---

## What This App Is

An Electron macOS app — a floating AI assistant pill that expands into a chat window. It is NOT a web app. It runs as a native macOS window with `transparent: true` and `vibrancy: 'under-window'` for frosted-glass appearance.

---

## Dev Environment

### Running the app
```bash
npm run dev
```

**Critical:** Never run with `ELECTRON_RUN_AS_NODE=1` set. The npm script clears it automatically. If the app hangs or fails silently:
```bash
unset ELECTRON_RUN_AS_NODE
npm run dev
```

### Node/npm versions
- Node.js 20+ required
- Native modules (`better-sqlite3`, `keytar`) must be rebuilt for Electron via `electron-rebuild`
- `postinstall` handles this automatically after `npm install`

---

## Architecture — Three Processes

### 1. Main process (`src/main/`)
- `index.ts` — app bootstrap, creates WindowManager, TrayManager, registers IPC
- `windows.ts` — manages pill, expanded, fullscreen windows; `setMode()` switches between them
- `ipc/handlers.ts` — ALL IPC handlers in one file; this is where new backend features go
- `services/` — Claude, database, keychain, memory, settings, timer, voice

### 2. Preload (`src/preload/index.ts`)
- Context bridge exposing the `window.agent` API to the renderer
- Every new IPC channel needs: handler in `handlers.ts` + bridge method here + type in `env.d.ts`

### 3. Renderer (`src/renderer/src/`)
- React 18 + Zustand stores
- Entry: `App.tsx` routes by URL hash (`#pill`, `#expanded`, `#fullscreen`)
- Three stores: `useConversationStore`, `useSettingsStore`, `useUIStore`

---

## Window System

| Window | Size | Purpose |
|---|---|---|
| Pill | 280×44 | Always-on-top floating widget |
| Expanded | 420×620 | Main chat interface |
| Fullscreen | 80% of screen | Full-featured view |

- All windows: `transparent: true`, `vibrancy: 'under-window'`, `visualEffectState: 'active'`
- Pill and Expanded are separate BrowserWindows — not iframes
- `setMode('pill')` immediately hides expanded. Close animations must finish BEFORE calling `setMode('pill')` — use the 300ms delay in `handleMinimize()`

---

## Transparency & Theming

### How transparency works
- Native macOS vibrancy (`vibrancy: 'under-window'`) provides the blur effect at the OS level
- CSS `background: transparent` lets native vibrancy show through
- CSS surfaces use very low opacity values to tint without blocking vibrancy
- **Do not** add `backdrop-filter` to the outer ExpandedView container — it kills native vibrancy

### CSS Variables (globals.css)
- Light mode: `--surface: rgba(255,255,255,0.60)`, `--surface-elevated: rgba(255,255,255,0.80)`
- Dark mode: `--surface: rgba(0,0,0,0.18)`, `--surface-elevated: rgba(0,0,0,0.28)`
- `--surface-solid` = fully opaque — used for Settings and History panels only
- Theme is set by adding `data-theme="dark"` to `document.documentElement`

### What should be transparent vs solid
- **Transparent:** Pill, main chat view, header, input bar wrapper, login/create account/onboarding
- **Solid (`--surface-solid`):** Settings panel, History panel, Onboarding content area

---

## Auth Flow

```
App launch
  └─ isAccountCreated?
       ├─ No  → LoginScreen (can go to CreateAccountScreen)
       └─ Yes → isOnboardingComplete?
                    ├─ No  → OnboardingWizard (2 steps)
                    └─ Yes → Main app
```

- Passwords stored as SHA-256 hashes in settings (not plaintext)
- Email verification codes: 6-digit, 10-minute expiry, stored in `pendingVerifications` Map in handlers.ts
- Real email sending is NOT implemented — codes are logged to console for development

### AppSettings auth fields
```ts
username: string
userEmail: string
userPasswordHash: string
isAccountCreated: boolean
isEmailVerified: boolean
isOnboardingComplete: boolean
```

---

## IPC Pattern

Adding a new feature requires changes in 3 places:

1. **`src/main/ipc/handlers.ts`** — add `ipcMain.handle('channel:name', ...)`
2. **`src/preload/index.ts`** — add method to the `api` object under the right namespace
3. **`src/renderer/src/env.d.ts`** — add type to the `Window.agent` interface

---

## State Management (Zustand)

### useConversationStore
- `messages`, `isStreaming`, `conversationId`
- `resetConversation()` — clears messages and generates new conversation ID (used by New Chat button)
- `loadHistory(messages)` — loads a past conversation
- Auto-saves title from first user message

### useSettingsStore
- Mirrors `AppSettings` from `src/shared/types.ts`
- `updateSetting(key, value)` — updates locally and calls `window.agent.settings.set()`

### useUIStore
- `theme`, `pillState`, `isSettingsOpen`, `isHistoryOpen`
- `setTheme(theme)` — updates state AND sets `data-theme` attribute on `<html>`

---

## Available Tools (Claude can use these)

| Tool | Description |
|---|---|
| `get_weather` | Current weather + forecast |
| `get_calendar_events` | Read calendar |
| `create_calendar_event` | Create event (confirms with user) |
| `modify_calendar_event` | Edit event |
| `delete_calendar_event` | Delete event (destructive — confirms) |
| `create_reminder` | Add reminder |
| `get_reminders` | List reminders |
| `get_emails` | Read emails |
| `send_email` | Send email (confirms) |
| `send_message` | Send iMessage (confirms) |
| `get_messages` | Read messages |
| `web_search` | DuckDuckGo search |
| `open_application` | Launch app |
| `close_application` | Close app (confirms) |
| `search_files` | Spotlight file search |
| `read_file` | Read file contents |
| `get_system_info` | CPU, memory, disk, battery |
| `set_timer` | Create countdown timer |
| `set_alarm` | Set alarm by time/date |
| `control_media` | Play/pause/skip media |
| `set_system_volume` | Adjust volume |
| `take_screenshot` | Capture screen |
| `get_clipboard` | Read clipboard |
| `set_clipboard` | Write clipboard |
| `save_memory` | Persist a memory |
| `search_memory` | Query memories |
| `create_note` | Create Apple Note |
| `run_calculation` | Math via mathjs |
| `get_time_in_timezone` | World clock |
| `open_url` | Open URL in browser |

Destructive tools (require user confirmation before executing): `send_email`, `send_message`, `delete_calendar_event`, `close_application`

---

## Key Files Quick Reference

| File | What it does |
|---|---|
| `src/shared/types.ts` | All shared TypeScript types including `AppSettings`, `ChatMessage`, `PillPosition` |
| `src/main/windows.ts` | Window creation, positioning, mode switching |
| `src/main/ipc/handlers.ts` | All IPC handlers |
| `src/preload/index.ts` | `window.agent` API bridge |
| `src/renderer/src/env.d.ts` | TypeScript types for `window.agent` |
| `src/renderer/src/globals.css` | All CSS variables, theme definitions, utility classes |
| `tailwind.config.js` | Custom animations (`scale-in`, `scale-out`), colors, keyframes |
| `src/renderer/src/components/Expanded/ExpandedView.tsx` | Root of chat UI, auth routing, animation |
| `src/renderer/src/components/Pill/PillView.tsx` | The floating pill widget |

---

## Common Gotchas

- **⚠️ NEVER revert OnboardingWizard to transparent/surface-solid backgrounds.** The "Set your preferences" page (step 2) MUST use the `.theme-opaque` CSS class on its drag header and content area. This is a hardcoded opaque white/dark background defined in globals.css that actually responds to `data-theme`. If you use `transparent` or `var(--surface-solid)` here, the page will always show native macOS vibrancy (system dark) and ignore the CSS theme — it will look dark even in light mode. This has been reverted by mistake multiple times. Do not change it.

- **`.theme-opaque` class:** Defined in `globals.css`. Use it on any page that must show a solid theme-correct background (white in light mode, near-black in dark mode) but shouldn't use `--surface-solid` (which gets set to `transparent` for the main transparent pages). Currently used by OnboardingWizard header + content.

- **Transparency architecture:** `--surface` and `--surface-elevated` are set to `transparent` globally so that the main chat page, pill, and auth pages are see-through (native macOS vibrancy shows behind). Pages that must be opaque (Settings, History, OnboardingWizard) must NOT rely on these variables — they must use `--surface-solid` (Settings/History) or `.theme-opaque` (Onboarding).

- **⚠️ NEVER set `--surface`, `--surface-elevated`, `.thread-scroll`, `.bubble-assistant`, or `.input-box` to `transparent` in light mode.** Native macOS vibrancy follows the SYSTEM theme, not the CSS theme. Setting backgrounds to `transparent` makes light mode look exactly like dark mode (gray/dark) because the system vibrancy shows through. Light mode surfaces MUST use `rgba(255,255,255, 0.60+)` — at minimum 0.55 opacity or the white tint is too weak to override the dark vibrancy. This has been broken many times. Do not lower these values.

- **Gray light mode:** If light mode looks gray/dark, check that CSS variable values use `rgba(255,255,255,...)` not `rgba(0,0,0,...)`. Pure `transparent` makes both themes look identical since native vibrancy follows system theme, not CSS theme.
- **Text invisible in light mode:** Hardcoded `rgba(0,0,0,0.04)` input backgrounds look fine in dark but invisible in light — use `var(--surface-elevated)` instead.
- **Animation doesn't go to pill:** `transformOrigin` is calculated from actual window bounds via `window:get-bounds` IPC on mount. If pill moves after mount, origin won't update until next open.
- **`ELECTRON_RUN_AS_NODE` error:** Unset this env var — it breaks Electron startup.
- **Native module errors after dependency changes:** Run `npm run rebuild` to recompile `better-sqlite3` and `keytar` for the current Electron version.
- **Settings not persisting:** `updateSetting` in `useSettingsStore` saves to disk via IPC. Direct `set()` on the store does NOT persist.
