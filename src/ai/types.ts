export type Message = { role: 'user' | 'assistant'; content: string };

export type AIProvider = {
  streamMessage: (messages: Message[]) => AsyncGenerator<string>;
};
