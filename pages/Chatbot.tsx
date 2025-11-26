import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChatMessage } from '../types';
import { startChat, sendMessageToChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { GEMINI_PRO_MODEL } from '../constants';
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session when component mounts
    const initChat = async () => {
      try {
        const newChat = startChat(GEMINI_PRO_MODEL);
        setChatSession(newChat);
        setMessages([
          {
            role: 'model',
            text: 'Olá! Sou seu assistente de IA. Como posso ajudar com sua estratégia de marketing hoje?',
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error('Error starting chat:', err);
        setError(`Failed to start chat: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages update
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading || !chatSession) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      text: inputMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const modelResponseText = await sendMessageToChat(chatSession, inputMessage);
      const newModelMessage: ChatMessage = {
        role: 'model',
        text: modelResponseText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newModelMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to get response: ${err instanceof Error ? err.message : String(err)}`);
      const errorMessage: ChatMessage = {
        role: 'model',
        text: 'Desculpe, não consegui processar sua solicitação no momento. Por favor, tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [inputMessage, loading, chatSession]);

  return (
    <div className="container mx-auto max-w-3xl flex flex-col h-[calc(100vh-140px)]">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">AI Chatbot</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="flex-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-y-auto mb-4 flex flex-col">
        <div className="flex-1 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-800'
                  } shadow-md`}
              >
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                <span className="block text-xs text-right opacity-75 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 p-3 rounded-lg shadow-md flex items-center">
                <LoadingSpinner />
                <span className="ml-2 text-sm">Digitando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
        <Input
          id="chatInput"
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Pergunte algo sobre marketing ou gere ideias..."
          className="flex-1 mr-2 p-2 border rounded-md"
          disabled={loading || !chatSession}
        />
        <Button
          type="submit"
          isLoading={loading}
          variant="primary"
          className="px-4 py-2"
          disabled={!inputMessage.trim() || !chatSession}
        >
          {loading ? <LoadingSpinner /> : <PaperAirplaneIcon className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
};

export default Chatbot;