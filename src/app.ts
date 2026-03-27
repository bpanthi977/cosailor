import { initDb } from './db';

import { AIProvider } from './ai/';
import { makeOpenrouterProvider } from './ai/openrouterProvider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

class _App {
  private ai: AIProvider | null = null;

  async init() {
    const client = createOpenRouter({
      apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
    });
    this.ai = makeOpenrouterProvider(client);

    await initDb()
  }

  getAI(): AIProvider {
    if (!this.ai) throw new Error('App.init() not called');
    return this.ai;
  }
}

export const App: _App = new _App();
