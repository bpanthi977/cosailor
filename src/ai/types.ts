export type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export type ToolResultMessage = {
  role: 'tool';
  content: string;
  tool_call_id: string;
};

export type AssistantToolCallMessage = {
  role: 'assistant';
  content: null;
  tool_calls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
};

export type ProviderMessage = Message | ToolResultMessage | AssistantToolCallMessage;

export type ToolDef = {
  name: string;
  description: string;
  parameters: object;
};

export type AIStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string; args: object }
  | { type: 'tool_done'; name: string; result: string };

export type AIProvider = {
  streamMessage: (messages: Message[], context: { sessionId: number }) => AsyncGenerator<AIStreamEvent>;
  close: () => void;
};
