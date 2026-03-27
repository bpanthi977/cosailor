# AI Service

Uses OpenRouter via `@openrouter/sdk` for LLM. The active provider is constructed once in `src/app.ts` via `makeOpenrouterProvider` and accessed by other modules through `App.getAI()`.

## Provider Interface

```ts
type AIStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string; args: object }
  | { type: 'tool_done'; name: string; result: string };

type AIProvider = {
  streamMessage: (messages: Message[]) => AsyncGenerator<AIStreamEvent>;
};
```

`streamMessage` yields a stream of typed events: text chunks during generation, and `tool_start`/`tool_done` bracketing each tool execution. The caller (ConversationSession) iterates this stream and reacts to each event.

## Streaming Implementation

React Native's `fetch` buffers the full response body before resolving, which causes streaming requests to hang. The provider uses `XMLHttpRequest` with `onprogress` instead, which fires incrementally as SSE chunks arrive.

## Tool Call Loop

Tools are passed into `makeOpenrouterProvider` at construction time (`app.ts` provides `TOOL_DEFS` and `executeToolCall`). The provider handles the full tool call loop internally:

1. Send request to OpenRouter with `tools` parameter
2. Accumulate `delta.tool_calls` chunks across SSE events
3. On `finish_reason: tool_calls`: execute all requested tools (sequentially), yielding `tool_start`/`tool_done` events
4. Build one `assistant` message listing all `tool_calls` + one `tool` message per result
5. Send a single follow-up request with the combined history and recurse

## Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `list_customers` | — | Returns all known customer names |
| `fetch_notes` | `customer_name: string` | Returns notes for a customer; creates the record if not found |
| `save_note` | `customer_name: string, note: string` | Appends a note for a customer |

Defined in `src/ai/tools.ts`. Tool execution calls SQLite directly (via `src/db/customers.ts`). In production these would be backend API calls to a CRM/ERP.
