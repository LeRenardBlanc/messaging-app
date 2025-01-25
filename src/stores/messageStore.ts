import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

interface MessageStore {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: Partial<Message>) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
}

export const useMessages = create<MessageStore>((set) => ({
  messages: [],
  loading: false,
  error: null,

  sendMessage: async (message) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([message])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        messages: [...state.messages, data as Message]
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ messages: data as Message[], error: null });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  }
}));