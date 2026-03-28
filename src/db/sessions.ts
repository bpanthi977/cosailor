import { getDb } from './schema';
import type { Session } from './types';

export type SessionListItem = Session & { has_notes: boolean };

export async function createSession(): Promise<number> {
  const db = getDb();
  const result = await db.runAsync('INSERT INTO sessions (title) VALUES (?)', '');
  return result.lastInsertRowId;
}

export async function updateSessionTitle(id: number, title: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    "UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
    title,
    id
  );
}

export async function touchSession(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync(
    "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
    id
  );
}

export async function getSession(id: number): Promise<Session | null> {
  const db = getDb();
  return db.getFirstAsync<Session>('SELECT * FROM sessions WHERE id = ?', id);
}

export async function deleteSession(sessionId: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', sessionId);
}

export async function listSessions(): Promise<SessionListItem[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Session & { has_notes: number }>(
    `SELECT s.*,
       CASE WHEN COUNT(n.id) > 0 THEN 1 ELSE 0 END as has_notes
     FROM sessions s
     LEFT JOIN notes n ON n.session_id = s.id
     GROUP BY s.id
     ORDER BY s.updated_at DESC`
  );
  return rows.map(r => ({ ...r, has_notes: r.has_notes === 1 }));
}
