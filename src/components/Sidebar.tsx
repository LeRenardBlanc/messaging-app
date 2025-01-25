import { type FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '../stores/conversationStore';
import { format } from 'date-fns';
import { MessageSquare, Users, Plus, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

const Sidebar: FC = () => {
  const { conversations, loading, createConversation } = useConversations();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('full_name', `%${searchQuery}%`)
          .limit(5);

        if (error) throw error;
        setSuggestions(data as User[]);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const userIds = [...selectedUsers.map(u => u.id)];
      const conversationId = await createConversation(userIds);
      setIsCreating(false);
      setSelectedUsers([]);
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 h-screen bg-white flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold">Messages</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {isCreating && (
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedUsers.map(user => (
              <div
                key={user.id}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
              >
                <span>{user.full_name}</span>
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="hover:text-blue-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
            {isSearching && (
              <div className="absolute right-2 top-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2 border rounded-lg shadow-sm">
              {suggestions.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {user.full_name?.[0]?.toUpperCase()}
                  </div>
                  <span>{user.full_name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateConversation}
              disabled={selectedUsers.length === 0}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Chat
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setSelectedUsers([]);
                setSearchQuery('');
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No conversations yet</div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => navigate(`/chat/${conversation.id}`)}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                {conversation.is_group ? (
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">
                      {conversation.title || conversation.participants.map(p => p.full_name).join(', ')}
                    </h3>
                    {conversation.last_message && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(conversation.last_message.created_at), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.last_message.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;