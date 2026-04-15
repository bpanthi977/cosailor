# Cosailor

AI co-pilot for field sales reps. Capture notes hands-free, get meeting briefs in seconds, and surface customer insights — all through a conversational interface on your phone.

## Features

- **Voice input** — tap the mic and dictate; speech is transcribed directly into the chat
- **Live voice conversations** — full-duplex audio mode with real-time waveform visualization and TTS responses
- **AI tool use** — the agent can look up customers, fetch past notes, and save new ones on your behalf
- **Skills** — reusable prompt templates (e.g. "Pre-meeting Brief", "Meeting Notes") the agent can invoke or you can trigger manually
- **Session history** — every conversation is saved locally; resume any previous session from the sidebar
- **Offline-first** — all state lives in SQLite on device; no custom backend required

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile framework | React Native 0.83 + Expo 55 (bare workflow) |
| Language | TypeScript |
| LLM | OpenRouter API |
| Database | SQLite (expo-sqlite) |
| Voice input | expo-speech-recognition |
| TTS | expo-speech |

## Getting Started

**Prerequisites:** Node.js, Expo CLI, and an iOS or Android dev environment.

```bash
npm install
```

Copy `.env.example` to `.env` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=sk-or-...
```

Then run:

```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
```

## Docs

See [`docs/architecture.md`](docs/architecture.md) for a full overview of the design, including the AI provider layer, conversation controller, database schema, and live conversation system.

## Videos

https://github.com/user-attachments/assets/4866dd8a-6720-4d24-9510-355c1ae7b0e8

https://github.com/user-attachments/assets/8d31063d-a69b-49e8-b5fa-a7adeb99c196

https://github.com/user-attachments/assets/16513c87-81c7-49ad-8365-222a622917ca

https://github.com/user-attachments/assets/1f2216be-5237-46fc-9df3-8f19deb96888

https://github.com/user-attachments/assets/175d78bd-bd99-41ed-9965-b786e6e1bbdc
