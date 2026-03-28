import { listSessions } from './db';
import type { Session } from './db';
import type { SessionListItem } from './db/sessions';

export type { Session, SessionListItem };

export async function getSessions(): Promise<SessionListItem[]> {
  return listSessions();
}
