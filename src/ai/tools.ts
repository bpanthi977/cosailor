import { listCustomers, fetchNotes, saveNote, upsertCustomer, getSkill } from '../db';
import type { ToolDef } from './types';

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'list_customers',
    description: 'Returns a list of all known customers.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'fetch_notes',
    description: 'Returns all saved notes and orders for a customer by name.',
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
    description: 'Saves a note or order for a customer.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name' },
        note: { type: 'string', description: 'Note text to save' },
      },
      required: ['customer_name', 'note'],
    },
  },
  {
    name: 'read_skill',
    description: 'Returns the full instructions for a named skill. Call this when you decide to apply a skill from the available skills list.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name exactly as listed in the available skills' },
      },
      required: ['name'],
    },
  },
];

export async function executeToolCall(
  name: string,
  args: object,
  context: { sessionId: number }
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
      await saveNote(a.customer_name, a.note, context.sessionId);
      return 'Note saved.';
    }
    case 'read_skill': {
      const skill = await getSkill(a.name);
      if (!skill) return `Skill "${a.name}" not found.`;
      return skill.instructions;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
