# Network Resilience

Cosailor is designed to work gracefully on unstable field networks. When the device goes offline, the app continues to accept input and automatically recovers when connectivity returns.

## Behavior

### Offline Queueing
User messages are written to SQLite with `status: pending` before any network call. If the device is offline, the message sits in that state until the network restores, at which point it is sent automatically — no user action required. Voice-to-text still works offline since transcription is processed on-device.

### Automatic Retry
When the network transitions from offline to online, `ConversationSession` automatically retries the first pending/failed assistant message in the active session.

### Offline Banner
`HomeScreen` shows a slim banner ("Offline — messages will send when connected") below the top bar whenever the device has no connectivity. It disappears automatically when the network returns.

### Live Conversation
If an AI request fails during a live conversation, the controller:
1. Speaks an error message via TTS: *"Sorry, I lost the connection. I'll retry when you're back online."*
2. Transitions to the `error` phase
3. Automatically resumes `listening` when network connectivity is restored

## Implementation

### `src/hooks/useNetwork.ts`
Wraps `@react-native-community/netinfo`.

```ts
// React hook — returns current connectivity (true = online)
useNetworkState(): boolean

// React hook — fires cb once each time the device goes offline → online
useNetworkRestore(cb: () => void): void

// Imperative version for non-hook controllers — returns unsubscribe fn
onNetworkRestore(cb: () => void): () => void
```

### `src/ConversationSession.ts`
- Subscribes to `onNetworkRestore` on construction; calls `retryPendingMessages()` automatically
- `retryPendingMessages()` finds the first `failed`/`pending` assistant message and retries it
- `destroy()` must be called when discarding a session to clean up the listener

### `src/screens/HomeScreen.tsx`
- Uses `useNetworkState()` to show/hide the offline banner
- Uses `useNetworkRestore()` to trigger retry on the current session

### `src/LiveConversationController.ts`
- On AI failure: speaks error via `TtsOutput`, transitions to `{ phase: 'error' }`
- On network restore: if phase is `error`, transitions back to `listening`
- Cleans up the `onNetworkRestore` subscription in `destroy()`

## Native Dependency
Network monitoring uses `@react-native-community/netinfo`. This is a native module — after `npm install`, a full dev client rebuild is required:
```
cd ios && pod install
expo run:ios
```
