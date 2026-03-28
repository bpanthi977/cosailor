import { getDb } from './schema';
import type { Customer, Note, Session } from './types';

export async function upsertCustomer(name: string): Promise<number> {
  const db = getDb();
  await db.runAsync('INSERT OR IGNORE INTO customers (name) VALUES (?)', name);
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM customers WHERE name = ?',
    name
  );
  return row!.id;
}

export async function listCustomers(): Promise<Customer[]> {
  const db = getDb();
  return db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name ASC');
}

export async function saveNote(customerName: string, text: string, sessionId: number): Promise<void> {
  const customerId = await upsertCustomer(customerName);
  const db = getDb();
  await db.runAsync(
    'INSERT INTO notes (customer_id, text, session_id) VALUES (?, ?, ?)',
    customerId,
    text,
    sessionId
  );
  await db.runAsync(
    "UPDATE customers SET updated_at = datetime('now') WHERE id = ?",
    customerId
  );
}

export async function fetchNotes(
  customerName: string
): Promise<{ customer: Customer; notes: Note[] } | null> {
  const db = getDb();
  const customer = await db.getFirstAsync<Customer>(
    'SELECT * FROM customers WHERE name = ?',
    customerName
  );
  if (!customer) return null;
  const notes = await db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE customer_id = ? ORDER BY created_at ASC',
    customer.id
  );
  return { customer, notes };
}

export async function getSessionsForCustomer(customerId: number): Promise<Session[]> {
  const db = getDb();
  return db.getAllAsync<Session>(
    `SELECT s.* FROM sessions s
     JOIN session_customers sc ON sc.session_id = s.id
     WHERE sc.customer_id = ?
     ORDER BY s.updated_at DESC`,
    customerId
  );
}

export async function getCustomerForSession(sessionId: number): Promise<Customer | null> {
  const db = getDb();
  return db.getFirstAsync<Customer>(
    `SELECT c.* FROM customers c
     JOIN session_customers sc ON sc.customer_id = c.id
     WHERE sc.session_id = ?`,
    sessionId
  );
}

export async function linkSessionToCustomer(
  sessionId: number,
  customerId: number
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO session_customers (session_id, customer_id) VALUES (?, ?)',
    sessionId,
    customerId
  );
}

export async function deleteNote(noteId: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', noteId);
}

export async function listCustomersByRecency(): Promise<Customer[]> {
  const db = getDb();
  return db.getAllAsync<Customer>(
    `SELECT c.*
     FROM customers c
     LEFT JOIN session_customers sc ON sc.customer_id = c.id
     LEFT JOIN sessions s ON s.id = sc.session_id
     GROUP BY c.id
     ORDER BY MAX(s.updated_at) DESC`
  );
}
