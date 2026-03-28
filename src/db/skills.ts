import { getDb } from './schema';

export type DbSkill = {
  id: number;
  name: string;
  summary: string;
  instructions: string;
};

export async function listSkills(): Promise<DbSkill[]> {
  const db = getDb();
  return db.getAllAsync<DbSkill>('SELECT id, name, summary, instructions FROM skills ORDER BY name ASC');
}

export async function getSkill(name: string): Promise<DbSkill | null> {
  const db = getDb();
  return db.getFirstAsync<DbSkill>(
    'SELECT id, name, summary, instructions FROM skills WHERE name = ?',
    [name]
  );
}

export async function createSkill(name: string, summary: string, instructions: string): Promise<number> {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO skills (name, summary, instructions) VALUES (?, ?, ?)',
    [name, summary, instructions]
  );
  return result.lastInsertRowId;
}

export async function updateSkill(id: number, name: string, summary: string, instructions: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE skills SET name = ?, summary = ?, instructions = ? WHERE id = ?',
    [name, summary, instructions, id]
  );
}

export async function deleteSkill(id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM skills WHERE id = ?', [id]);
}
