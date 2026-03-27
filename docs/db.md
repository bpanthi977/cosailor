# Database (SQLite)

Using `expo-sqlite`. SQLite is the source of truth — all user actions are written locally before any network call.

## Schema

```sql
sessions    (id, title, created_at, updated_at)
messages    (id, session_id, role, content, status, created_at)
            -- status: 'ok' | 'pending' | 'failed'
tool_calls  (id, message_id, tool_name, arguments, result, status)
feedback    (id, message_id, rating, comment, created_at)
customers   (id, name, updated_at)
notes       (id, customer_id, text, created_at)
```

## Offline Resilience

User messages are written with `status: pending` before any network call. On success → `ok`. On failure → `failed`, and the UI shows a retry option. Retry replays the full conversation context from that session to the AI.

## Interface

src/db/index.ts exports the following types and functions to store and retriev information from the db.

```ts
export type Session = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type DbMessage = {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  status: 'ok' | 'pending' | 'failed';
  created_at: string;
};

export type ToolCall = {
  id: number;
  message_id: number;
  tool_name: string;
  arguments: string;
  result: string | null;
  status: 'ok' | 'pending' | 'failed';
};

export type Customer = {
  id: number;
  name: string;
  updated_at: string;
};

export type Note = {
  id: number;
  customer_id: number;
  text: string;
  created_at: string;
};

export type Feedback = {
  id: number;
  message_id: number;
  rating: 1 | -1;
  comment: string | null;
  created_at: string;
};

// Sessions
createSession(): Promise<number>
updateSessionTitle(id, title): Promise<void>
touchSession(id): Promise<void>
getSession(id): Promise<Session | null>
listSessions(): Promise<Session[]>          // ordered by updated_at DESC

// Messages
createMessage(sessionId, role, content, status?): Promise<number>  // default status 'ok'
updateMessageStatus(id, status): Promise<void>
appendMessageContent(id, extra): Promise<void>  // streaming: appends without read-modify-write
getMessagesForSession(sessionId): Promise<DbMessage[]>

// Tool calls
createToolCall(messageId, toolName, args: object): Promise<number>
updateToolCall(id, result, status): Promise<void>
getToolCallsForMessage(messageId): Promise<ToolCall[]>

// Feedback
saveFeedback(messageId, rating: 1|-1, comment?): Promise<void>

// Customers & notes
upsertCustomer(name): Promise<number>       // INSERT OR IGNORE + return id
listCustomers(): Promise<Customer[]>
saveNote(customerName, text): Promise<void>
fetchNotes(customerName): Promise<{ customer: Customer; notes: Note[] } | null>
linkSessionToCustomer(sessionId, customerId): Promise<void>
```
