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
  getFeedbackForMessage,
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
  feedback?: { rating: 1 | -1; comment: string | null };
};

export class ConversationSession {
  private sessionId: number | null;
  private msgs: ChatMessage[] = [];
  private streaming = false;
  private notify: (msgs: ChatMessage[]) => void;
  private onStreaming: (v: boolean) => void;

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

  getMessages(): ChatMessage[] {
    return this.msgs;
  }

  setCallbacks(
    notify: (msgs: ChatMessage[]) => void,
    onStreaming: (v: boolean) => void,
  ): void {
    this.notify = notify;
    this.onStreaming = onStreaming;
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
            const feedback = await getFeedbackForMessage(m.id);
            if (feedback) {
              msg.feedback = feedback;
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

  async sendMessage(text: string): Promise<void> {
    if (!text.trim() || this.streaming) return;
    const isNew = this.sessionId === null;
    const sid = await this.ensureSession();
    if (isNew) {
      void updateSessionTitle(sid, text.slice(0, 40));
    }
    const userMsgId = await createMessage(sid, 'user', text, 'ok');
    const aiMsgId = await createMessage(sid, 'assistant', '', 'pending');

    this.update(prev => [
      ...prev,
      { role: 'user', content: text, id: userMsgId, status: 'ok' },
      { role: 'assistant', content: '', id: aiMsgId, status: 'pending', streaming: true },
    ]);

    const history: Message[] = this.msgs
      .filter(m => m.id !== aiMsgId)
      .map(m => ({ role: m.role, content: m.content }));

    await this.streamResponse(aiMsgId, history);
  }

  async retryMessage(failedMsgId: number): Promise<void> {
    if (this.sessionId === null || this.streaming) return;

    await updateMessageStatus(failedMsgId, 'pending');
    this.update(prev =>
      prev.map(m => m.id === failedMsgId ? { ...m, content: '', status: 'pending' } : m)
    );

    const dbMsgs = await getMessagesForSession(this.sessionId);
    const failedIdx = dbMsgs.findIndex(m => m.id === failedMsgId);
    const history: Message[] = dbMsgs
      .slice(0, failedIdx)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    await this.streamResponse(failedMsgId, history);
  }

  private async streamResponse(aiMsgId: number, conversation: Message[]): Promise<void> {
    this.streaming = true;
    this.onStreaming(true);
    let fullContent = '';
    let pendingToolCallId: number | null = null;
    try {
      const stream = App.getAI().streamMessage(conversation);
      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.content;
          this.update(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m)
          );
        } else if (event.type === 'tool_start') {
          pendingToolCallId = await createToolCall(aiMsgId, event.name, event.args);
          const step: ToolStep = { id: pendingToolCallId, name: event.name, args: event.args, status: 'running' };
          this.update(prev =>
            prev.map(m =>
              m.id === aiMsgId
                ? { ...m, toolSteps: [...(m.toolSteps ?? []), step] }
                : m
            )
          );
        } else if (event.type === 'tool_done' && pendingToolCallId !== null) {
          await updateToolCall(pendingToolCallId, event.result, 'ok');
          const stepId = pendingToolCallId;
          this.update(prev =>
            prev.map(m =>
              m.id === aiMsgId
                ? {
                    ...m,
                    toolSteps: m.toolSteps?.map(s =>
                      s.id === stepId ? { ...s, status: 'ok', result: event.result } : s
                    ),
                  }
                : m
            )
          );
          pendingToolCallId = null;
        }
      }
      await appendMessageContent(aiMsgId, fullContent);
      await updateMessageStatus(aiMsgId, 'ok');
      this.update(prev =>
        prev.map(m => m.id === aiMsgId ? { ...m, streaming: false, status: 'ok' } : m)
      );
    } catch {
      if (pendingToolCallId !== null) {
        await updateToolCall(pendingToolCallId, '', 'failed');
      }
      await updateMessageStatus(aiMsgId, 'failed');
      this.update(prev =>
        prev.map(m => m.id === aiMsgId ? { ...m, streaming: false, status: 'failed' } : m)
      );
    } finally {
      this.streaming = false;
      this.onStreaming(false);
    }
  }
}
