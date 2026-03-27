import { getDb } from './schema';
import type { Session } from './types';

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

export async function listSessions(): Promise<Session[]> {
  const db = getDb();
  return db.getAllAsync<Session>('SELECT * FROM sessions ORDER BY updated_at DESC');
}
