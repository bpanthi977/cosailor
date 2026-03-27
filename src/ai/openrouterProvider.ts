import { OpenRouter } from '@openrouter/sdk';
import type { AIProvider, Message } from './types';

const MODEL = 'google/gemini-2.0-flash-lite-001';

export function makeOpenrouterProvider(client: OpenRouter): AIProvider {
  return {
    async *streamMessage(messages: Message[]): AsyncGenerator<string> {
      const stream = await client.chat.send({
        chatGenerationParams: { model: MODEL, messages, stream: true },
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
    },
  };
}
