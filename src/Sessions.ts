import { listSessions, getMessagesForSession } from './db';
import type { Session } from './db';
import type { ChatMessage } from './ConversationSession';

export { Session };

export async function getSessions(): Promise<Session[]> {
  return listSessions();
}

export async function loadSessionMessages(sessionId: number): Promise<ChatMessage[]> {
  const dbMsgs = await getMessagesForSession(sessionId);
  return dbMsgs
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      status: m.status,
    }));
}
