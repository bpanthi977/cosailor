# Cosailor — Architecture

Cosailor is a mobile-first, multimodal AI chat app for field sales reps. It acts as a co-pilot on the go: capturing notes hands-free, preparing meeting briefs in seconds, and surfacing customer insights — all from a conversational interface.

## Main Features

- User can have conversation with AI via chat, or voice input 
- User can have live voice converstation with AI
- All sessions are saved 
- AI has access to tools so that it can save notes regarding customers and the orders they made 
- AI keep track of customers

## Core Principles

- **Offline-first:** SQLite is written before any network call. No message is ever lost. Failed requests are retried, not dropped. See [db.md](db.md).
- **Streaming everything:** AI responses stream token by token. Tool call progress is shown in real time. 
- **Tool-based reasoning:** The AI is given data access through tools.
- **No backend:** For the current prototype there is no custom backend. the app talks directly to OpenRouter's API from the device, and all state lives in SQLite.

## Tech Stack

- **React Native** via Expo (bare workflow)
- **UI:** shadcn/ui design tokens (RN-adapted — colors, typography, radius, spacing)
- **AI:** `@openrouter/sdk` behind an abstraction layer (mock provider first, real LLM plugged in later)
- **Voice:** Device speech recognition (Expo Speech / `@react-native-voice/voice`)
- **Persistence:** SQLite (via `expo-sqlite`)
- **Navigation:** @react-navigation/native

## Controller Layer

More details in [controllers.md](controllerss.md)

- `ConversationSession` — manages one active session (send, retry, reset, resume)
- `Sessions` — read-only helpers for listing and loading past sessions

## UI Structure

More details in [ui.md](ui.md)

- Home screen shows conversation view where user starts a new conversation. Text entry field at the bottom. Hamburger icon opens the session sidebar.
- Sidebar (slide-in drawer from left) lists past sessions with search; tap to resume or start a new conversation.
- For search customers interface, user can select a customer and see all the conversations that refer to him
- Live conversation UI: Full-screen modal. Continuous bidirectional audio — user speaks, agent responds via TTS. Waveform shown for both sides.
- Inline voice input: Hold mic button → device speech recognition → transcript injected into chat input → sent as user message. No screen change.




