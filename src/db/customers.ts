import { getDb } from './schema';
import type { Customer, Note } from './types';

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

export async function saveNote(customerName: string, text: string): Promise<void> {
  const customerId = await upsertCustomer(customerName);
  const db = getDb();
  await db.runAsync(
    'INSERT INTO notes (customer_id, text) VALUES (?, ?)',
    customerId,
    text
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
