import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Conversation } from '../types';

interface ConversationStore {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  createConversation: (participants: string[]) => Promise<string>;
}

export const useConversations = create<ConversationStore>((set) => ({
  conversations: [],
  loading: false,
  error: null,

  fetchConversations: async () => {
    set({ loading: true });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(user:profiles(*)),
          last_message:messages(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithParticipants = data.map((conv: any) => ({
        ...conv,
        participants: conv.participants.map((p: any) => p.user)
      }));

      set({ 
        conversations: conversationsWithParticipants,
        error: null 
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createConversation: async (participants) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user found');

      const allParticipants = [...participants, userData.user.id];
      
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ is_group: allParticipants.length > 2 }])
        .select()
        .single();

      if (error) throw error;

      const participantInserts = allParticipants.map(userId => ({
        conversation_id: data.id,
        user_id: userId
      }));

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(participantInserts);

      if (participantError) throw participantError;

      return data.id;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  }
}));