export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  status?: 'online' | 'offline';
  last_seen?: string;
}

export interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  conversation_id: string;
  type: 'text' | 'image' | 'file';
  file_url?: string;
  read?: boolean;
}

export interface Conversation {
  id: string;
  title?: string;
  created_at: string;
  last_message?: Message;
  participants: User[];
  is_group: boolean;
}