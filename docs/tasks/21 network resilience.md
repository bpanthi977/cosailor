# Task 21: Network Resilience

## Goal
Make the app resilient to unstable/offline networks so the user doesn't need to manually retry failures.

## Features

### 1. Automatic Retry on Network Recovery
When a message has `status: 'pending'` or `status: 'failed'` and the device comes back online, automatically re-trigger the AI call without user action. Guard against re-sending a message that is already in-flight.

### 2. Offline Indicator + Queued Sending
- Show an offline banner when network is unavailable
- Do NOT disable send — messages are written to SQLite as `pending` and auto-sent when network recovers
- Voice-to-text (device-processed) still works offline; resulting text is queued like any typed message

### 3. Live Conversation Resilience
- On AI request failure: speak an error message via TTS ("Sorry, I lost connection"), transition to `error` state
- Auto-resume listening once network recovers

## Implementation Plan

### Step 1 — Network Monitor Hook
Create `src/hooks/useNetwork.ts`:
- Wraps `NetInfo` (@react-native-community/netinfo, available via Expo)
- Exports `useNetworkState()` hook (returns `isConnected: boolean`)
- Exports `onNetworkRestore(cb)` — registers a callback fired once on transition to online

### Step 2 — Auto-retry in ConversationSession
In `src/ConversationSession.ts`:
- Add `retryPendingMessages()` method: queries DB for pending/failed messages in this session, re-runs AI call
- Guard: skip if already processing (in-flight flag)
- Wire up to network restore event

### Step 3 — Offline Banner in HomeScreen
In `src/screens/HomeScreen.tsx`:
- Subscribe to `useNetworkState()`
- Show a slim banner ("Offline — messages will send when connected") when offline

### Step 4 — Live Conversation Error State
In `LiveConversationController.ts`:
- On AI request failure: call TtsOutput to speak error, transition to `error` state
- Subscribe to network restore: if in `error` state, auto-transition to `listening`

### Step 5 — Update Docs
- `docs/ui.md`: offline banner
- `docs/controllers.md`: retry behavior and network monitor

## Files to Modify
- `src/hooks/useNetwork.ts` (new)
- `src/ConversationSession.ts`
- `src/screens/HomeScreen.tsx`
- `src/LiveConversationController.ts` (or wherever it lives)
- `docs/ui.md`
- `docs/controllers.md`

## Verification
1. Offline → type message → see pending → online → message auto-sends
2. Offline banner appears/disappears with network state
3. Offline → open live conversation → AI fails → hear spoken error → online → auto-resumes listening
