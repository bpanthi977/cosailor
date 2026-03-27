# Controllers

Controllers sit between UI screens and the database/AI. They own all session lifecycle logic so that screen components stay UI-only.

## Modules

### `src/ConversationSession.ts` — single active session

Manages one conversation: creating it lazily on first message, streaming AI responses, and retrying failed messages. Constructed with an optional existing session ID to resume a past session.

Auto-sets the session title (truncated to 40 chars) from the first user message.

```ts
export type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  status?: 'ok' | 'pending' | 'failed';
  toolStatus?: string;   // set while a tool is executing, cleared on done
};

export type SessionEvent =
  | { type: 'add_messages'; userMsg: ChatMessage; aiMsg: ChatMessage }
  | { type: 'chunk'; id: number; content: string }
  | { type: 'tool_status'; label: string }   // e.g. "Fetching notes for Acme…"
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

### `src/Sessions.ts` — session list

Read-only helpers for listing past sessions. Used by the sidebar.

```ts
// All sessions ordered by most recently updated
getSessions(): Promise<Session[]>
```
