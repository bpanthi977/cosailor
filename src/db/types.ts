export type Session = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type DbMessage = {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  status: 'ok' | 'pending' | 'failed';
  created_at: string;
};

export type ToolCall = {
  id: number;
  message_id: number;
  tool_name: string;
  arguments: string;
  result: string | null;
  status: 'ok' | 'pending' | 'failed';
};

export type Customer = {
  id: number;
  name: string;
  updated_at: string;
};

export type Note = {
  id: number;
  customer_id: number;
  session_id: number;
  text: string;
  created_at: string;
};

export type Feedback = {
  id: number;
  message_id: number;
  rating: 1 | -1;
  comment: string | null;
  created_at: string;
};
