import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isLoading, disabled, value, onChange }) => {
  const [internalText, setInternalText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isControlled = value !== undefined;
  const text = isControlled ? value : internalText;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (isControlled && onChange) {
      onChange(val);
    } else {
      setInternalText(val);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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
    
    if (isControlled && onChange) {
      onChange('');
    } else {
      setInternalText('');
    }

    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 bg-surface border border-gray-200 rounded-2xl p-2 shadow-soft transition-shadow duration-200 focus-within:shadow-md focus-within:border-gray-300"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Shift+Enter for new line)"
        className="w-full bg-transparent text-body placeholder-muted text-base px-3 py-2.5 max-h-[160px] resize-none focus:outline-none scrollbar-hide"
        rows={1}
        disabled={isLoading || disabled}
      />
      
      {isLoading && onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="p-2.5 rounded-xl mb-0.5 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-red-500 transition-colors"
          title="Stop Generating"
        >
          <StopIcon className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!text.trim() || isLoading || disabled}
          className={`p-2.5 rounded-xl mb-0.5 transition-all duration-200 ${
            !text.trim() || isLoading || disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
          }`}
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      )}
    </form>
  );
};

export default ChatInput;