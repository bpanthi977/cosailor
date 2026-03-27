# Controllers

Controllers sit between UI screens and the database/AI. They own all session lifecycle logic so that screen components stay UI-only.

## Modules

### `src/ConversationSession.ts` — single active session

Manages one conversation: creating it lazily on first message, streaming AI responses, and retrying failed messages. Constructed with an optional existing session ID to resume a past session.

Auto-sets the session title (truncated to 40 chars) from the first user message.

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

export type SessionEvent =
  | { type: 'add_messages'; userMsg: ChatMessage; aiMsg: ChatMessage }
  | { type: 'chunk'; id: number; content: string }
  | { type: 'tool_start'; msgId: number; step: ToolStep }    // step.status === 'running'
  | { type: 'tool_done'; msgId: number; stepId: number; result: string; status: 'ok' | 'failed' }
  | { type: 'done'; id: number; status: 'ok' | 'failed' };

class ConversationSession {
  constructor(sessionId?: number)   // omit for new session; pass id to resume existing

  // Load persisted messages — call after constructing with an existing session ID
  loadMessages(): Promise<ChatMessage[]>

  // Stream a new user message — yields SessionEvents for the UI to consume
  sendMessage(text: string, history: ChatMessage[]): AsyncGenerator<SessionEvent>

  // Retry a previously failed AI message
  retryMessage(failedMsgId: number): AsyncGenerator<SessionEvent>
}
```

To start a new conversation, construct a new `ConversationSession()`. To resume, construct with the existing ID and call `loadMessages()`.

### `src/VoiceInput.ts` — speech recognition

Wraps `expo-speech-recognition`. UI never imports the library directly.

```ts
// True if the device supports speech recognition (synchronous)
VoiceInput.isAvailable(): boolean

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

### `src/Sessions.ts` — session list

Read-only helpers for listing past sessions. Used by the sidebar.

```ts
// All sessions ordered by most recently updated
getSessions(): Promise<Session[]>
```
