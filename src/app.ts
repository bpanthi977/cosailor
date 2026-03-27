import { initDb } from './db';

import { AIProvider } from './ai/';
import { makeOpenrouterProvider } from './ai/openrouterProvider';
import { OpenRouter } from '@openrouter/sdk';

class _App {
  private ai: AIProvider | null = null;

  async init() {
    const client = new OpenRouter({ apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY });
    this.ai = makeOpenrouterProvider(client);

    await initDb()
  }

  getAI(): AIProvider {
    if (!this.ai) throw new Error('App.init() not called');
    return this.ai;
  }
}

export const App: _App = new _App();
