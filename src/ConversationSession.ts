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
} from './db';

export type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  status?: 'ok' | 'pending' | 'failed';
  toolStatus?: string;
};

export type SessionEvent =
  | { type: 'add_messages'; userMsg: ChatMessage; aiMsg: ChatMessage }
  | { type: 'chunk'; id: number; content: string }
  | { type: 'tool_status'; label: string }
  | { type: 'done'; id: number; status: 'ok' | 'failed' };

export class ConversationSession {
  private sessionId: number | null;

  constructor(sessionId?: number) {
    this.sessionId = sessionId ?? null;
  }

  async loadMessages(): Promise<ChatMessage[]> {
    if (this.sessionId === null) return [];
    const dbMsgs = await getMessagesForSession(this.sessionId);
    return dbMsgs
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        status: m.status,
      }));
  }

  private async ensureSession(): Promise<number> {
    if (this.sessionId === null) {
      this.sessionId = await createSession();
    }
    return this.sessionId;
  }

  async *sendMessage(text: string, history: ChatMessage[]): AsyncGenerator<SessionEvent> {
    const isNew = this.sessionId === null;
    const sid = await this.ensureSession();
    if (isNew) {
      void updateSessionTitle(sid, text.slice(0, 40));
    }
    const userMsgId = await createMessage(sid, 'user', text, 'ok');
    const aiMsgId = await createMessage(sid, 'assistant', '', 'pending');

    yield {
      type: 'add_messages',
      userMsg: { role: 'user', content: text, id: userMsgId, status: 'ok' },
      aiMsg: { role: 'assistant', content: '', id: aiMsgId, status: 'pending', streaming: true },
    };

    const aiHistory: Message[] = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];
    yield* this.streamResponse(aiMsgId, aiHistory);
  }

  async *retryMessage(failedMsgId: number): AsyncGenerator<SessionEvent> {
    if (this.sessionId === null) return;

    await updateMessageStatus(failedMsgId, 'pending');
    yield { type: 'chunk', id: failedMsgId, content: '' };

    const dbMsgs = await getMessagesForSession(this.sessionId);
    const failedIdx = dbMsgs.findIndex(m => m.id === failedMsgId);
    const history: Message[] = dbMsgs
      .slice(0, failedIdx)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    yield* this.streamResponse(failedMsgId, history);
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
          yield { type: 'tool_status', label: toolLabel(event.name, event.args) };
        } else if (event.type === 'tool_done' && pendingToolCallId !== null) {
          await updateToolCall(pendingToolCallId, event.result, 'ok');
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

function toolLabel(name: string, args: object): string {
  const a = args as Record<string, string>;
  switch (name) {
    case 'list_customers': return 'Listing customers…';
    case 'fetch_notes': return `Fetching notes for ${a.customer_name}…`;
    case 'save_note': return `Saving note for ${a.customer_name}…`;
    default: return `Calling ${name}…`;
  }
}
