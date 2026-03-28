import { App } from './app';
import type { Message } from './ai/types';
import {
  createSession,
  createMessage,
  updateMessageStatus,
  appendMessageContent,
  getMessagesForSession,
  updateSessionTitle,
  createToolCall,
  updateToolCall,
  getToolCallsForMessage,
} from './db';

export type ToolStep = {
  id: number;
  name: string;
  args: object;
  status: 'running' | 'ok' | 'failed';
  result?: string;
};

export type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  status?: 'ok' | 'pending' | 'failed';
  toolSteps?: ToolStep[];
};

type SessionEvent =
  | { type: 'add_messages'; userMsg: ChatMessage; aiMsg: ChatMessage }
  | { type: 'chunk'; id: number; content: string }
  | { type: 'tool_start'; msgId: number; step: ToolStep }
  | { type: 'tool_done'; msgId: number; stepId: number; result: string; status: 'ok' | 'failed' }
  | { type: 'done'; id: number; status: 'ok' | 'failed' };

export class ConversationSession {
  private sessionId: number | null;
  private msgs: ChatMessage[] = [];
  private streaming = false;
  private readonly notify: (msgs: ChatMessage[]) => void;
  private readonly onStreaming: (v: boolean) => void;

  constructor(
    notify: (msgs: ChatMessage[]) => void,
    onStreaming: (v: boolean) => void,
    sessionId?: number,
  ) {
    this.notify = notify;
    this.onStreaming = onStreaming;
    this.sessionId = sessionId ?? null;
  }

  private update(fn: (prev: ChatMessage[]) => ChatMessage[]) {
    this.msgs = fn(this.msgs);
    this.notify(this.msgs);
  }

  async loadMessages(): Promise<void> {
    if (this.sessionId === null) {
      this.msgs = [];
      this.notify([]);
      return;
    }
    const dbMsgs = await getMessagesForSession(this.sessionId);
    const msgs = await Promise.all(
      dbMsgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(async m => {
          const msg: ChatMessage = {
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            status: m.status,
          };
          if (m.role === 'assistant') {
            const toolCalls = await getToolCallsForMessage(m.id);
            if (toolCalls.length > 0) {
              msg.toolSteps = toolCalls.map(tc => ({
                id: tc.id,
                name: tc.tool_name,
                args: JSON.parse(tc.arguments || '{}'),
                status: tc.status === 'ok' ? 'ok' : tc.status === 'failed' ? 'failed' : 'running',
                result: tc.result ?? undefined,
              }));
            }
          }
          return msg;
        })
    );
    this.msgs = msgs;
    this.notify(msgs);
  }

  private async ensureSession(): Promise<number> {
    if (this.sessionId === null) {
      this.sessionId = await createSession();
    }
    return this.sessionId;
  }

  private applyEvent(event: SessionEvent) {
    if (event.type === 'add_messages') {
      this.update(prev => [...prev, event.userMsg, event.aiMsg]);
    } else if (event.type === 'chunk') {
      this.update(prev =>
        prev.map(m => m.id === event.id ? { ...m, content: event.content } : m)
      );
    } else if (event.type === 'tool_start') {
      this.update(prev =>
        prev.map(m =>
          m.id === event.msgId
            ? { ...m, toolSteps: [...(m.toolSteps ?? []), event.step] }
            : m
        )
      );
    } else if (event.type === 'tool_done') {
      this.update(prev =>
        prev.map(m =>
          m.id === event.msgId
            ? {
                ...m,
                toolSteps: m.toolSteps?.map(s =>
                  s.id === event.stepId
                    ? { ...s, status: event.status, result: event.result }
                    : s
                ),
              }
            : m
        )
      );
    } else if (event.type === 'done') {
      this.update(prev =>
        prev.map(m =>
          m.id === event.id ? { ...m, streaming: false, status: event.status } : m
        )
      );
    }
  }

  private async runStream(gen: AsyncGenerator<SessionEvent>) {
    this.streaming = true;
    this.onStreaming(true);
    try {
      for await (const event of gen) {
        this.applyEvent(event);
      }
    } finally {
      this.streaming = false;
      this.onStreaming(false);
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (!text.trim() || this.streaming) return;
    const isNew = this.sessionId === null;
    const sid = await this.ensureSession();
    if (isNew) {
      void updateSessionTitle(sid, text.slice(0, 40));
    }
    const userMsgId = await createMessage(sid, 'user', text, 'ok');
    const aiMsgId = await createMessage(sid, 'assistant', '', 'pending');

    this.applyEvent({
      type: 'add_messages',
      userMsg: { role: 'user', content: text, id: userMsgId, status: 'ok' },
      aiMsg: { role: 'assistant', content: '', id: aiMsgId, status: 'pending', streaming: true },
    });

    const aiHistory: Message[] = [
      ...this.msgs
        .filter(m => m.id !== aiMsgId)
        .map(m => ({ role: m.role, content: m.content })),
    ];
    await this.runStream(this.streamResponse(aiMsgId, aiHistory));
  }

  async retryMessage(failedMsgId: number): Promise<void> {
    if (this.sessionId === null || this.streaming) return;

    await updateMessageStatus(failedMsgId, 'pending');
    this.applyEvent({ type: 'chunk', id: failedMsgId, content: '' });

    const dbMsgs = await getMessagesForSession(this.sessionId);
    const failedIdx = dbMsgs.findIndex(m => m.id === failedMsgId);
    const history: Message[] = dbMsgs
      .slice(0, failedIdx)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    await this.runStream(this.streamResponse(failedMsgId, history));
  }

  private async *streamResponse(
    aiMsgId: number,
    conversation: Message[]
  ): AsyncGenerator<SessionEvent> {
    let fullContent = '';
    let pendingToolCallId: number | null = null;
    try {
      const stream = App.getAI().streamMessage(conversation);
      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.content;
          yield { type: 'chunk', id: aiMsgId, content: fullContent };
        } else if (event.type === 'tool_start') {
          pendingToolCallId = await createToolCall(aiMsgId, event.name, event.args);
          yield {
            type: 'tool_start',
            msgId: aiMsgId,
            step: { id: pendingToolCallId, name: event.name, args: event.args, status: 'running' },
          };
        } else if (event.type === 'tool_done' && pendingToolCallId !== null) {
          await updateToolCall(pendingToolCallId, event.result, 'ok');
          yield { type: 'tool_done', msgId: aiMsgId, stepId: pendingToolCallId, result: event.result, status: 'ok' };
          pendingToolCallId = null;
        }
      }
      await appendMessageContent(aiMsgId, fullContent);
      await updateMessageStatus(aiMsgId, 'ok');
      yield { type: 'done', id: aiMsgId, status: 'ok' };
    } catch {
      if (pendingToolCallId !== null) {
        await updateToolCall(pendingToolCallId, '', 'failed');
      }
      await updateMessageStatus(aiMsgId, 'failed');
      yield { type: 'done', id: aiMsgId, status: 'failed' };
    }
  }
}
