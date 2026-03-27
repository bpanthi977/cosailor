import { listSessions } from './db';
import type { Session } from './db';

export type { Session };

export async function getSessions(): Promise<Session[]> {
  return listSessions();
}
