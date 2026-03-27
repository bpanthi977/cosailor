import { getDb } from './schema';
import type { DbMessage, ToolCall } from './types';

export async function createMessage(
  sessionId: number,
  role: 'user' | 'assistant' | 'tool',
  content: string,
  status: 'ok' | 'pending' | 'failed' = 'ok'
): Promise<number> {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO messages (session_id, role, content, status) VALUES (?, ?, ?, ?)',
    sessionId,
    role,
    content,
    status
  );
  return result.lastInsertRowId;
}

export async function updateMessageStatus(
  id: number,
  status: 'ok' | 'pending' | 'failed'
): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE messages SET status = ? WHERE id = ?', status, id);
}

export async function appendMessageContent(id: number, extra: string): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE messages SET content = content || ? WHERE id = ?', extra, id);
}

export async function getMessagesForSession(sessionId: number): Promise<DbMessage[]> {
  const db = getDb();
  return db.getAllAsync<DbMessage>(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC',
    sessionId
  );
}

export async function createToolCall(
  messageId: number,
  toolName: string,
  args: object
): Promise<number> {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO tool_calls (message_id, tool_name, arguments) VALUES (?, ?, ?)',
    messageId,
    toolName,
    JSON.stringify(args)
  );
  return result.lastInsertRowId;
}

export async function updateToolCall(
  id: number,
  result: string,
  status: 'ok' | 'failed'
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE tool_calls SET result = ?, status = ? WHERE id = ?',
    result,
    status,
    id
  );
}

export async function getToolCallsForMessage(messageId: number): Promise<ToolCall[]> {
  const db = getDb();
  return db.getAllAsync<ToolCall>(
    'SELECT * FROM tool_calls WHERE message_id = ?',
    messageId
  );
}

export async function saveFeedback(
  messageId: number,
  rating: 1 | -1,
  comment?: string
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'INSERT INTO feedback (message_id, rating, comment) VALUES (?, ?, ?)',
    messageId,
    rating,
    comment ?? null
  );
}
