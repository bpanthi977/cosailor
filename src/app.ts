import { initDb } from './db';

import { AIProvider } from './ai/';
import { makeOpenrouterProvider } from './ai/openrouterProvider';
import { TOOL_DEFS, executeToolCall } from './ai/tools';

class _App {
  private ai: AIProvider | null = null;

  async init() {
    this.ai = makeOpenrouterProvider(
      process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '',
      { defs: TOOL_DEFS, execute: executeToolCall }
    );

    await initDb()
  }

  getAI(): AIProvider {
    if (!this.ai) throw new Error('App.init() not called');
    return this.ai;
  }
}

export const App: _App = new _App();
