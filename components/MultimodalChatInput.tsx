import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon, StopCircleIcon } from '@heroicons/react/24/solid';
import AudioVisualizer from './AudioVisualizer'; // Reutilizando o visualizador

interface MultimodalChatInputProps {
  onSendText: (message: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  isTextLoading: boolean;
  isVoiceActive: boolean;
  isListening: boolean;
  disabled?: boolean;
  textValue: string;
  onTextChange: (value: string) => void;
  userAnalyser?: AnalyserNode | null; // Opcional para visualizar a voz do usuário
}

const MultimodalChatInput: React.FC<MultimodalChatInputProps> = ({
  onSendText,
  onStartVoice,
  onStopVoice,
  isTextLoading,
  isVoiceActive,
  isListening,
  disabled,
  textValue,
  onTextChange,
  userAnalyser,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [textValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textValue.trim() || isTextLoading || disabled) return;
    onSendText(textValue);
    onTextChange('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      onStopVoice();
    } else {
      onStartVoice();
    }
  };

  return (
    <div className="relative">
      {isListening && (
        <div className="absolute bottom-full left-0 right-0 h-20 mb-2 flex items-center justify-center">
            <div className="w-full max-w-sm h-full bg-surface/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg flex items-center justify-center px-4">
                 <p className="text-sm font-medium text-primary animate-pulse mr-4">Ouvindo...</p>
                 <div className="w-full h-1/2">
                    {/* Placeholder for user voice visualizer */}
                    <div className="w-full h-full bg-primary/10 rounded-lg"></div>
                 </div>
            </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 bg-surface border border-gray-200 rounded-2xl p-2 shadow-soft transition-shadow duration-200 focus-within:shadow-md focus-within:border-gray-300"
      >
        <textarea
          ref={textareaRef}
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Ouvindo..." : "Digite ou use o microfone..."}
          className="w-full bg-transparent text-body placeholder-muted text-base px-3 py-2.5 max-h-[160px] resize-none focus:outline-none scrollbar-hide"
          rows={1}
          disabled={isTextLoading || disabled || isListening}
        />

        {!isListening && (
           <button
             type="submit"
             disabled={!textValue.trim() || isTextLoading || disabled}
             className={`p-2.5 rounded-xl mb-0.5 transition-all duration-200 flex-shrink-0 ${
               !textValue.trim() || isTextLoading || disabled
                 ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                 : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
             }`}
           >
             <PaperAirplaneIcon className="w-5 h-5" />
           </button>
        )}

        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={disabled && !isListening}
          className={`p-2.5 rounded-xl mb-0.5 transition-all duration-200 flex-shrink-0 ${
            isListening
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-primary hover:text-white'
          }`}
        >
          {isListening ? (
            <StopCircleIcon className="w-5 h-5" />
          ) : (
            <MicrophoneIcon className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};

export default MultimodalChatInput;
