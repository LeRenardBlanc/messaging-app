import React, { useState, useEffect, useRef } from 'react';
import { useMessages } from '../stores/messageStore';
import { Send, Image, Paperclip, Mic, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
}

export default function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const { messages, loading, sendMessage } = useMessages();
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendMessage({
      content: newMessage,
      conversation_id: conversationId,
      user_id: currentUserId,
      type: 'text',
      created_at: new Date().toISOString(),
    });

    setNewMessage('');
  };

  const uploadToSupabase = async (file: File, type: 'image' | 'audio' | 'file') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${conversationId}/${fileName}`;

    try {
      const { error: uploadError, data } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percentage));
          },
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await sendMessage({
        content: file.name,
        conversation_id: conversationId,
        user_id: currentUserId,
        type,
        file_url: publicUrl,
        created_at: new Date().toISOString(),
      });

      setUploadProgress(0);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);
      setPreviewUrl(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    await uploadToSupabase(
      file,
      file.type.startsWith('image/') ? 'image' : 'file'
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'audio-message.wav', { type: 'audio/wav' });
        await uploadToSupabase(audioFile, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.user_id === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 shadow-md transform transition-all duration-200 hover:scale-[1.02] ${
                    message.user_id === currentUserId
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  {message.type === 'image' ? (
                    <motion.img
                      src={message.file_url}
                      alt="Shared image"
                      className="max-w-full rounded cursor-pointer"
                      layoutId={`image-${message.id}`}
                      onClick={() => window.open(message.file_url, '_blank')}
                    />
                  ) : message.type === 'audio' ? (
                    <audio controls className="w-full">
                      <source src={message.file_url} type="audio/wav" />
                      Your browser does not support the audio element.
                    </audio>
                  ) : message.type === 'file' ? (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      {message.content}
                    </a>
                  ) : (
                    <div className="break-words">{message.content}</div>
                  )}
                  <div className={`text-xs mt-1 ${
                    message.user_id === currentUserId ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {format(new Date(message.created_at), 'HH:mm')}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {uploadProgress > 0 && (
        <div className="px-4 py-2 bg-blue-50">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="p-4 border-t bg-gray-50">
          <div className="relative inline-block">
            <img src={previewUrl} alt="Preview" className="max-h-32 rounded" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="border-t p-4 bg-white">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Image className="w-5 h-5 text-gray-500" />
          </motion.button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onTouchStart={startRecording}
            onMouseDown={startRecording}
            onTouchEnd={stopRecording}
            onMouseUp={stopRecording}
            className={`p-2 rounded-full transition-colors ${
              isRecording ? 'bg-red-500 text-white' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <Mic className="w-5 h-5" />
          </motion.button>

          {isRecording && (
            <div className="text-red-500 animate-pulse">
              {formatTime(recordingTime)}
            </div>
          )}

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-full focus:outline-none focus:border-blue-500 transition-colors"
          />
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}