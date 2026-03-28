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
  linkSessionToCustomer,
  getCustomerForSession,
  upsertCustomer,
  listSkills,
  type DbSkill,
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
  private customerContext: { id: number; name: string } | null;

  constructor(
    notify: (msgs: ChatMessage[]) => void,
    onStreaming: (v: boolean) => void,
    sessionId?: number,
    customerContext?: { id: number; name: string },
  ) {
    this.notify = notify;
    this.onStreaming = onStreaming;
    this.sessionId = sessionId ?? null;
    this.customerContext = customerContext ?? null;
  }

  private buildHistory(msgs: Message[], skills: DbSkill[] = []): Message[] {
    return [
      ...(this.customerContext
        ? [{ role: 'system' as const, content: `The customer in this conversation is "${this.customerContext.name}".` }]
        : []),
      ...(skills.length > 0
        ? [{ role: 'system' as const, content: `Available skills (call read_skill with the exact name to get full instructions before applying):\n${skills.map(s => `- ${s.name}: ${s.summary}`).join('\n')}` }]
        : []),
      ...msgs,
    ];
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
    const customer = await getCustomerForSession(this.sessionId);
    if (customer) this.customerContext = { id: customer.id, name: customer.name };
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
      if (this.customerContext) {
        await linkSessionToCustomer(sid, this.customerContext.id);
      }
    }
    const userMsgId = await createMessage(sid, 'user', text, 'ok');
    const aiMsgId = await createMessage(sid, 'assistant', '', 'pending');

    this.update(prev => [
      ...prev,
      { role: 'user', content: text, id: userMsgId, status: 'ok' },
      { role: 'assistant', content: '', id: aiMsgId, status: 'pending', streaming: true },
    ]);

    const skills = await listSkills();
    const history = this.buildHistory(
      this.msgs
        .filter(m => m.id !== aiMsgId)
        .map(m => ({ role: m.role, content: m.content })),
      skills
    );

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
    const skills = await listSkills();
    const history = this.buildHistory(
      dbMsgs
        .slice(0, failedIdx)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      skills
    );

    await this.streamResponse(failedMsgId, history);
  }

  private async streamResponse(aiMsgId: number, conversation: Message[]): Promise<void> {
    this.streaming = true;
    this.onStreaming(true);
    let fullContent = '';
    let pendingToolCallId: number | null = null;
    try {
      if (this.sessionId === null) {
        console.error('[ConversationSession] streamResponse called without sessionId');
      }
      const stream = App.getAI().streamMessage(conversation, { sessionId: this.sessionId! });
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
      if (this.sessionId !== null) {
        const aiMsg = this.msgs.find(m => m.id === aiMsgId);
        for (const step of aiMsg?.toolSteps ?? []) {
          if (step.name === 'fetch_notes' || step.name === 'save_note') {
            const a = step.args as { customer_name?: string };
            if (a.customer_name) {
              const customerId = await upsertCustomer(a.customer_name);
              await linkSessionToCustomer(this.sessionId, customerId);
            }
          }
        }
      }
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
