import type { AIProvider, Message } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-lite-001';

export function makeOpenrouterProvider(apiKey: string): AIProvider {
  return {
    streamMessage: (messages) => xhrStream(apiKey, messages),
  };
}

async function* xhrStream(apiKey: string, messages: Message[]): AsyncGenerator<string> {
  // React Native's fetch buffers the full body before resolving, so it hangs
  // on streaming responses. XMLHttpRequest.onprogress fires incrementally.
  const pending: string[] = [];
  let notify: (() => void) | null = null;
  let done = false;
  let xhrError: string | null = null;
  let cursor = 0;
  let lineBuffer = '';

  const parseLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const data = line.slice(6).trim();
    if (data === '[DONE]') return;
    try {
      const json = JSON.parse(data);
      const content = json.choices?.[0]?.delta?.content;
      if (content) {
        pending.push(content);
        notify?.();
      }
    } catch {}
  };

  const processText = (text: string) => {
    lineBuffer += text;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';
    for (const line of lines) parseLine(line);
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', OPENROUTER_URL);
  xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onprogress = () => {
    const newText = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    processText(newText);
  };

  xhr.onload = () => {
    processText(xhr.responseText.slice(cursor));
    done = true;
    notify?.();
  };

  xhr.onerror = () => {
    xhrError = `Request failed (status ${xhr.status})`;
    done = true;
    notify?.();
  };

  xhr.send(JSON.stringify({ model: MODEL, messages, stream: true }));

  while (true) {
    if (pending.length > 0) {
      yield pending.shift()!;
    } else if (done) {
      break;
    } else {
      await new Promise<void>(resolve => {
        notify = () => { notify = null; resolve(); };
      });
    }
  }

  if (xhrError) throw new Error(xhrError);
}
