import { App } from './app';
import type { Message } from './ai/types';
import {
  createSession,
  createMessage,
  updateMessageStatus,
  appendMessageContent,
  getMessagesForSession,
} from './db';

export type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  status?: 'ok' | 'pending' | 'failed';
};

export type SessionEvent =
  | { type: 'add_messages'; userMsg: ChatMessage; aiMsg: ChatMessage }
  | { type: 'chunk'; id: number; content: string }
  | { type: 'done'; id: number; status: 'ok' | 'failed' };

export class ConversationSession {
  private sessionId: number | null = null;

  private async ensureSession(): Promise<number> {
    if (this.sessionId === null) {
      this.sessionId = await createSession();
    }
    return this.sessionId;
  }

  async *sendMessage(text: string, history: ChatMessage[]): AsyncGenerator<SessionEvent> {
    const sid = await this.ensureSession();
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
    try {
      const stream = App.getAI().streamMessage(conversation);
      for await (const chunk of stream) {
        fullContent += chunk;
        yield { type: 'chunk', id: aiMsgId, content: fullContent };
      }
      await appendMessageContent(aiMsgId, fullContent);
      await updateMessageStatus(aiMsgId, 'ok');
      yield { type: 'done', id: aiMsgId, status: 'ok' };
    } catch {
      await updateMessageStatus(aiMsgId, 'failed');
      yield { type: 'done', id: aiMsgId, status: 'failed' };
    }
  }
}
