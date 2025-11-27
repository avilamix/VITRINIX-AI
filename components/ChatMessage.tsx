import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { SparklesIcon, UserCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary/20' : 'bg-accent/10'}`}>
          {isUser ? (
            <UserCircleIcon className="w-6 h-6 text-primary" />
          ) : (
            <SparklesIcon className="w-5 h-5 text-accent" />
          )}
        </div>

        {/* Message Bubble */}
        <div className="flex flex-col">
          <div
            className={`relative px-5 py-3.5 rounded-2xl shadow-md text-sm leading-relaxed md:text-base ${
              isUser
                ? 'bg-primary text-white rounded-tr-none'
                : 'bg-lightbg text-textdark border border-gray-800 rounded-tl-none'
            }`}
          >
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.text}
            </div>
            
            {/* Copy Button (Visible on Hover for AI messages) */}
            {!isUser && (
              <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1 text-textmuted opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
                title="Copiar texto"
                aria-label="Copiar resposta"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Timestamp */}
          <span className={`text-[10px] text-textmuted mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;