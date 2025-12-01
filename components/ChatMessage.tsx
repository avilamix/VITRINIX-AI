
import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { SparklesIcon, UserIcon, ClipboardDocumentIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
  };

  if (isTool) {
    return (
      <div className="flex w-full justify-center mb-4">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-xs text-muted border border-gray-200 dark:border-gray-700 animate-pulse">
          <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
          <span className="font-mono">{message.text}</span>
          {message.toolCall && (
             <span className="text-[10px] opacity-70 hidden sm:inline">
               ({JSON.stringify(message.toolCall.args).substring(0, 30)}...)
             </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
          isUser 
            ? 'bg-primary text-white border-primary' 
            : 'bg-white text-primary border-gray-200 shadow-sm'
        }`}>
          {isUser ? (
            <UserIcon className="w-4 h-4" />
          ) : (
            <SparklesIcon className="w-4 h-4" />
          )}
        </div>

        {/* Message Bubble */}
        <div className="flex flex-col max-w-full">
          <div
            className={`relative px-5 py-4 rounded-2xl shadow-sm text-[15px] leading-relaxed border ${
              isUser
                ? 'bg-primary text-white border-primary rounded-tr-sm'
                : 'bg-surface text-body border-gray-100 rounded-tl-sm'
            }`}
          >
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2" style={{ color: isUser ? 'white' : 'inherit' }}>
              {message.text}
            </div>
            
            {!isUser && (
              <button 
                onClick={handleCopy}
                className="absolute top-3 right-3 p-1.5 text-muted hover:text-primary bg-background/50 hover:bg-background rounded-md opacity-0 group-hover:opacity-100 transition-all"
                title="Copiar para a área de transferência"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <span className={`text-[10px] text-muted mt-1.5 font-medium ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
