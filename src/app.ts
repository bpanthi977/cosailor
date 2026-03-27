import { AIProvider } from './ai/';
import { mockProvider } from './ai/mockProvider';

class _App {
  getAI(): AIProvider {
    return mockProvider;
  }
}

export const App: _App = new _App();
