import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import type { AIProvider, Message } from './types';

export function makeOpenrouterProvider(
  client: ReturnType<typeof createOpenRouter>
): AIProvider {
  return {
    async *streamMessage(messages: Message[]): AsyncGenerator<string> {
      const result = streamText({
        model: client('google/gemini-3.1-flash-lite-preview'),
        messages,
      });
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    },
  };
}
