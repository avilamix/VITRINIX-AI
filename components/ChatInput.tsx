import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading || disabled) return;
    onSend(text);
    setText('');
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 bg-lightbg border border-gray-700 rounded-xl p-2 shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-200"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem... (Shift+Enter para pular linha)"
        className="w-full bg-transparent text-textdark placeholder-textmuted text-sm md:text-base px-3 py-2 max-h-[150px] resize-none focus:outline-none scrollbar-thin scrollbar-thumb-gray-700"
        rows={1}
        disabled={isLoading || disabled}
        aria-label="Mensagem do chat"
      />
      
      <button
        type="submit"
        disabled={!text.trim() || isLoading || disabled}
        className={`p-2 rounded-lg mb-0.5 transition-colors duration-200 flex-shrink-0 ${
          !text.trim() || isLoading || disabled
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
        }`}
        aria-label="Enviar mensagem"
      >
        {isLoading ? (
          <div className="w-5 h-5 flex items-center justify-center">
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <PaperAirplaneIcon className="w-5 h-5" />
        )}
      </button>
    </form>
  );
};

export default ChatInput;