import type {
  AIProvider,
  AIStreamEvent,
  AssistantToolCallMessage,
  ProviderMessage,
  ToolDef,
  ToolResultMessage,
} from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3-flash-preview';
const SYSTEM_MESSAGE = 'You are a AI agent to help a salesman. Use provided tools to store important information about customer, fetch customer information to give factual answer. Answer the last question asked by user.'

type Tools = {
  defs: ToolDef[];
  execute: (name: string, args: object) => Promise<string>;
};

type PendingToolCall = { id: string; name: string; argsJson: string };

export function makeOpenrouterProvider(apiKey: string, tools?: Tools): AIProvider {
  return {
    streamMessage: (messages) => xhrStream(apiKey, messages, tools),
  };
}

async function* xhrStream(
  apiKey: string,
  messages: ProviderMessage[],
  tools?: Tools
): AsyncGenerator<AIStreamEvent> {
  // React Native's fetch buffers the full body before resolving, so it hangs
  // on streaming responses. XMLHttpRequest.onprogress fires incrementally.
  const pending: AIStreamEvent[] = [];
  let notify: (() => void) | null = null;
  let done = false;
  let xhrError: string | null = null;
  let cursor = 0;
  let lineBuffer = '';

  let pendingTool: PendingToolCall | null = null;

  // Tool calls are async but parseLine is sync — queue them for after XHR loop
  const resolvedToolCalls: Array<{ tool: PendingToolCall; args: object }> = [];

  const parseLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const data = line.slice(6).trim();
    if (data === '[DONE]') return;
    try {
      const json = JSON.parse(data);

      // Accumulate text content
      const content = json.choices?.[0]?.delta?.content;
      if (content) {
        pending.push({ type: 'text', content });
        notify?.();
      }

      // Accumulate tool call delta
      const tc = json.choices?.[0]?.delta?.tool_calls?.[0];
      if (tc) {
        if (tc.id) pendingTool = { id: tc.id, name: tc.function?.name ?? '', argsJson: '' };
        if (pendingTool && tc.function?.arguments) pendingTool.argsJson += tc.function.arguments;
      }

      // Detect end of tool call
      const finishReason = json.choices?.[0]?.finish_reason;
      if (finishReason === 'tool_calls' && pendingTool) {
        try {
          resolvedToolCalls.push({ tool: pendingTool, args: JSON.parse(pendingTool.argsJson) });
        } catch {
          resolvedToolCalls.push({ tool: pendingTool, args: {} });
        }
        pendingTool = null;
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

  const body: Record<string, unknown> = { model: MODEL, messages, stream: true };
  if (tools) {
    body.tools = tools.defs.map(d => ({ type: 'function', function: d }));
  }

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

  xhr.send(JSON.stringify(body));

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

  // Execute all tool calls, then send one combined follow-up request.
  // The OpenAI spec requires one assistant message listing all tool_calls,
  // followed by one tool message per result — all in a single request.
  if (resolvedToolCalls.length > 0 && tools) {
    const toolResults: Array<{ tool: PendingToolCall; result: string }> = [];
    for (const { tool, args } of resolvedToolCalls) {
      yield { type: 'tool_start', name: tool.name, args };
      const result = await tools.execute(tool.name, args);
      yield { type: 'tool_done', name: tool.name, result };
      toolResults.push({ tool, result });
    }

    const assistantMsg: AssistantToolCallMessage = {
      role: 'assistant',
      content: null,
      tool_calls: toolResults.map(({ tool }) => ({
        id: tool.id,
        type: 'function',
        function: { name: tool.name, arguments: tool.argsJson },
      })),
    };
    const toolResultMsgs: ToolResultMessage[] = toolResults.map(({ tool, result }) => ({
      role: 'tool',
      content: result,
      tool_call_id: tool.id,
    }));
    yield* xhrStream(apiKey, [{ role: 'system', content: SYSTEM_MESSAGE }, ...messages, assistantMsg, ...toolResultMsgs], tools);
  }
}
