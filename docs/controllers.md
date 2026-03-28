# Controllers

Controllers sit between UI screens and the database/AI. They own all session lifecycle logic so that screen components stay UI-only.

## Modules

### `src/ConversationSession.ts` — single active session

Manages one conversation: creating it lazily on first message, streaming AI responses, and retrying failed messages. Directly updates the caller's messages state via callbacks — no intermediate event types.

```ts
export type ToolStep = {
  id: number;          // DB tool_calls row id
  name: string;
  args: object;
  status: 'running' | 'ok' | 'failed';
  result?: string;
};

export type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  status?: 'ok' | 'pending' | 'failed';
  toolSteps?: ToolStep[];  // populated live during streaming; restored from DB on session load
};

class ConversationSession {
  // notify: called with the full messages array on every update
  // onStreaming: called with true when streaming starts, false when done
  // sessionId: omit for new session; pass id to resume existing
  constructor(
    notify: (msgs: ChatMessage[]) => void,
    onStreaming: (v: boolean) => void,
    sessionId?: number,
  )

  // Load persisted messages — calls notify with loaded messages
  loadMessages(): Promise<void>

  // Send a new user message and stream the AI response
  sendMessage(text: string): Promise<void>

  // Retry a previously failed AI message
  retryMessage(failedMsgId: number): Promise<void>
}
```

To start a new conversation, construct a new `ConversationSession(notify, onStreaming)`. To resume, construct with the existing ID and call `loadMessages()`.

### `src/VoiceInput.ts` — speech recognition

Wraps `expo-speech-recognition`. UI never imports the library directly.

```ts
// True if the device supports speech recognition (synchronous, but typed as Promise<boolean>)
VoiceInput.isAvailable(): boolean | Promise<boolean>

// Requests mic permission, then starts recognition.
// onPartial fires with interim transcripts; onResult fires with the final
// transcript when recognition ends; onError fires on failure or denied permission.
VoiceInput.start(callbacks: { onPartial, onResult, onError }): Promise<void>

// Stops capturing — final result still fires via onResult callback
VoiceInput.stop(): void

// Cancels immediately without firing onResult
VoiceInput.cancel(): void

// Removes all event listeners (call in useEffect cleanup)
VoiceInput.destroy(): void
```

### Live conversation controllers

See [live_conversation.md](live_conversation.md) for `TtsOutput` and `LiveConversationController`.

### `src/Sessions.ts` — session list

Read-only helpers for listing past sessions. Used by the sidebar.

```ts
// All sessions ordered by most recently updated
getSessions(): Promise<Session[]>
```
