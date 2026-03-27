# Controllers

Controllers sits between the UI screens and the database/AI. They owns all session lifecycle logic and interaction with db and AI so that screen components stay UI-only.

## Modules

### `src/ConversationSession.ts` — single active session

Manages one conversation: creating it lazily on first message, streaming AI responses, and retrying failed messages.

Auto-sets the session title (truncated to 40 chars) from the first user message.

```ts
export type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  status?: 'ok' | 'pending' | 'failed';
};

export type SessionEvent =
  | { type: 'add_messages'; userMsg: ChatMessage; aiMsg: ChatMessage }
  | { type: 'chunk'; id: number; content: string }
  | { type: 'done'; id: number; status: 'ok' | 'failed' };

class ConversationSession {
  // Start a new conversation (clears the current session reference)
  reset(): void

  // Point this session at an existing DB session (used when resuming from sidebar)
  loadExistingSession(id: number): void

  // Stream a new user message — yields SessionEvents for the UI to consume
  sendMessage(text: string, history: ChatMessage[]): AsyncGenerator<SessionEvent>

  // Retry a previously failed AI message
  retryMessage(failedMsgId: number): AsyncGenerator<SessionEvent>
}
```

### `src/Sessions.ts` — multi-session utilities

Read-only helpers for listing and loading past sessions. Used by the sidebar and any future session-management UI.

```ts
// All sessions ordered by most recently updated
getSessions(): Promise<Session[]>

// Load messages for a given session, ready to display in the chat UI
// Filters out tool-role messages; maps DbMessage → ChatMessage
loadSessionMessages(sessionId: number): Promise<ChatMessage[]>
```
