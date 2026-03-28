# Live Voice Conversation

Full-screen bidirectional audio mode. The user speaks freely; the AI responds via TTS. Uses the same turn-by-turn conversational model (not a live/realtime API).

## Architecture

The voice loop runs as a state machine in `src/LiveConversationController.ts`. A React hook (`src/hooks/useLiveConversation.ts`) adapts it for use in `src/screens/LiveConversationScreen.tsx`.

### `src/TtsOutput.ts` — text-to-speech output

Wraps `expo-speech`. UI code never imports the library directly.

```ts
type TtsCallbacks = {
  onStart: () => void;
  onDone: () => void;
  onError: () => void;
  onBoundary?: (charIndex: number) => void; // word boundary; iOS only
};

TtsOutput.isAvailable(): boolean
TtsOutput.speak(text: string, callbacks: TtsCallbacks): void
TtsOutput.stop(): void
TtsOutput.destroy(): void
```

### `src/LiveConversationController.ts` — voice loop state machine

Pure TypeScript class; no React imports. Owns silence detection, TTS playback, and interrupt logic.

```ts
export type LiveState =
  | { phase: 'idle' }
  | { phase: 'listening'; partialText: string }
  | { phase: 'processing_ai' }
  | { phase: 'speaking_ai'; responseText: string; spokenCharIndex: number }
  | { phase: 'error'; message: string };

class LiveConversationController {
  constructor(session: ConversationSession)
  start(): void       // idle → listening
  stop(): void        // any → idle; cleans up TTS and recognition
  destroy(): void     // stop + unsubscribe all listeners
  subscribe(cb: (state: LiveState) => void): () => void
  getState(): LiveState
}
```

**State machine:**
```
IDLE → (start) → LISTENING
LISTENING:
  partial arrives → reset 1500ms silence timer
  silence timer fires (with speech) → stop recognition → PROCESSING_AI
  silence timer fires (no speech) → keep waiting
  user taps End → IDLE

PROCESSING_AI:
  session.sendMessage() called with onTextChunk callback
  first complete sentence arrives → SPEAKING_AI (TTS starts immediately)
  failure or empty stream → LISTENING (retry)

SPEAKING_AI:
  background VoiceInput interrupt listener active
  responseText grows in real time as more AI text streams in
  sentences queued and spoken back-to-back as they arrive
  onBoundary → update spokenCharIndex (sentenceOffset + charIndex)
  interrupt (partial > 3 chars) → stop TTS, clear queue → LISTENING with partial text
  TTS queue drains and stream done → LISTENING (loop continues)
  user taps End → IDLE
```

**Silence detection:** 1500ms debounce after last `onPartial`. Only fires if speech was detected.

**Interrupt on user speech:** A second `VoiceInput.start()` runs while AI is speaking. Any partial transcript longer than 3 characters stops TTS and transitions to LISTENING.

## Session Sharing

`ConversationSession` is constructed in HomeScreen's `useChatController` hook and passed by reference to `LiveConversationScreen` via navigation params. The controller calls `session.sendMessage()` on the same instance. `ConversationSession.setCallbacks(notify, onStreaming)` allows each screen to register its own state update callbacks. HomeScreen re-registers via `useFocusEffect` when the modal closes.

## Navigation

`LiveConversationScreen` is registered as `fullScreenModal` with `slide_from_bottom` animation in the root stack navigator. The back gesture is blocked while a conversation is active.

## Waveform Visualization

`src/components/Waveform.tsx` renders 5 animated bars driven by `Animated.Value[]` with `useNativeDriver: true` (transform.scaleY only).

- **User bars:** driven by `partialText` length changes in `useLiveConversation`
- **AI bars:** looping staggered animation while phase is `speaking_ai`
- **AI text:** spoken portion at full opacity, pending portion dimmed (`opacity` via text color `#71717a`), split at `spokenCharIndex`
