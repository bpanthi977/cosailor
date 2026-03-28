export { initDb, getDb } from './schema';
export type { Session, DbMessage, ToolCall, Customer, Note, Feedback } from './types';
export { createSession, updateSessionTitle, touchSession, getSession, listSessions, deleteSession } from './sessions';
export {
  createMessage,
  updateMessageStatus,
  appendMessageContent,
  getMessagesForSession,
  createToolCall,
  updateToolCall,
  getToolCallsForMessage,
  saveFeedback,
  getFeedbackForMessage,
} from './messages';
export {
  upsertCustomer,
  listCustomers,
  listCustomersByRecency,
  saveNote,
  fetchNotes,
  deleteNote,
  linkSessionToCustomer,
  getSessionsForCustomer,
  getCustomerForSession,
} from './customers';
export type { DbSkill } from './skills';
export { listSkills, getSkill, createSkill, updateSkill, deleteSkill } from './skills';
