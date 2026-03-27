export { initDb, getDb } from './schema';
export type { Session, DbMessage, ToolCall, Customer, Note, Feedback } from './types';
export { createSession, updateSessionTitle, touchSession, getSession, listSessions } from './sessions';
export {
  createMessage,
  updateMessageStatus,
  appendMessageContent,
  getMessagesForSession,
  createToolCall,
  updateToolCall,
  getToolCallsForMessage,
  saveFeedback,
} from './messages';
export {
  upsertCustomer,
  listCustomers,
  saveNote,
  fetchNotes,
  linkSessionToCustomer,
} from './customers';
