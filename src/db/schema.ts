import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

export async function initDb(): Promise<void> {
  db = await SQLite.openDatabaseAsync('cosailor.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      title     TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK(role IN ('user','assistant','tool')),
      content    TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok','pending','failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tool_calls (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      tool_name  TEXT NOT NULL,
      arguments  TEXT NOT NULL DEFAULT '{}',
      result     TEXT,
      status     TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('ok','pending','failed'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      rating     INTEGER NOT NULL CHECK(rating IN (1, -1)),
      comment    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_customers (
      session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      PRIMARY KEY (session_id, customer_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_message_id ON tool_calls(message_id);
    CREATE INDEX IF NOT EXISTS idx_notes_customer_id ON notes(customer_id);
    CREATE INDEX IF NOT EXISTS idx_session_customers_session ON session_customers(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_customers_customer ON session_customers(customer_id);
  `);
}
