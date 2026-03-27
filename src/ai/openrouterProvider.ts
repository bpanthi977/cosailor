import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import type { AIProvider, Message } from './types';

export function makeOpenrouterProvider(
  client: ReturnType<typeof createOpenRouter>
): AIProvider {
  return {
    async *streamMessage(messages: Message[]): AsyncGenerator<string> {
      const result = streamText({
        model: client('anthropic/claude-3.5-haiku'),
        messages,
      });
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    },
  };
}
