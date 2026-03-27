import { listCustomers, fetchNotes, saveNote, upsertCustomer } from '../db';
import type { ToolDef } from './types';

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'list_customers',
    description: 'Returns a list of all known customers.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'fetch_notes',
    description: 'Returns all saved notes for a customer by name. Creates the customer record if not found.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name' },
      },
      required: ['customer_name'],
    },
  },
  {
    name: 'save_note',
    description: 'Saves a note for a customer.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name' },
        note: { type: 'string', description: 'Note text to save' },
      },
      required: ['customer_name', 'note'],
    },
  },
];

export async function executeToolCall(
  name: string,
  args: object
): Promise<string> {
  const a = args as Record<string, string>;
  switch (name) {
    case 'list_customers': {
      const customers = await listCustomers();
      return JSON.stringify(customers.map(c => c.name));
    }
    case 'fetch_notes': {
      await upsertCustomer(a.customer_name);
      const result = await fetchNotes(a.customer_name);
      if (!result || result.notes.length === 0) return JSON.stringify([]);
      return JSON.stringify(result.notes.map(n => n.text));
    }
    case 'save_note': {
      await saveNote(a.customer_name, a.note);
      return 'Note saved.';
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
