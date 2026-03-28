import type { AIProvider, AIStreamEvent, Message } from './types';

const CANNED = "Hello! I'm your AI sales co-pilot. How can I help you today? I can look up customer notes, log new information, or help you prepare for your next meeting.";

async function* streamMessage(_messages: Message[]): AsyncGenerator<AIStreamEvent> {
  const words = CANNED.split(' ');
  for (let i = 0; i < words.length; i++) {
    await new Promise<void>(r => setTimeout(r, 80));
    yield { type: 'text', content: i < words.length - 1 ? words[i] + ' ' : words[i] };
  }
}

export const mockProvider: AIProvider = { streamMessage, close: () => {}};
