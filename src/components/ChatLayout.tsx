import { type FC } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';

interface ChatLayoutProps {
  currentUserId: string;
  selectedConversationId?: string;
}

const ChatLayout: FC<ChatLayoutProps> = ({ currentUserId, selectedConversationId }) => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1">
        {selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;