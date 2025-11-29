

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { startChatAsync, sendMessageToChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { GEMINI_FLASH_MODEL } from '../constants';
import { 
  TrashIcon, 
  SparklesIcon, 
  CircleStackIcon, 
  BoltIcon, 
  LightBulbIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';

const SUGGESTIONS = [
  "Create a 7-day editorial calendar for SaaS marketing.",
  "Write 5 persuasive headlines for a B2B webinar.",
  "Analyze current trends in cloud computing.",
  "Refine this paragraph to be more executive-level: [Paste text]"
];

const QUICK_PROMPTS = [
  "Draft Social Post",
  "Professional Rewrite",
  "Strategic Plan",
  "SWOT Analysis",
  "Sales Funnel",
  "Email Response",
  "Generate Keywords"
];

const PROVIDERS: ProviderName[] = ['Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Meta LLaMA'];

const SYSTEM_INSTRUCTION = `You are a sophisticated Enterprise AI Assistant specialized in Marketing, Strategy, and Content.
Provide concise, actionable, and professional responses. Use a neutral, business-oriented tone.
When asked for content, format it clearly with headings and bullet points.`;

const STORAGE_KEY = 'nexus_chat_history';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>('Google Gemini');
  const [inputText, setInputText] = useState<string>('');
  
  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const kbName = localStorage.getItem('vitrinex_kb_name'); // Kept key for compatibility
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const initChat = useCallback(async () => {
    try {
      setLoading(true);
      let initialHistory: ChatMessageType[] = [];
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        try { initialHistory = JSON.parse(stored); } catch (e) { console.error(e); }
      }

      if (initialHistory.length === 0) {
        initialHistory = [{
          role: 'model',
          text: `Hello. I am your Enterprise AI Assistant (${selectedProvider}). How may I assist with your objectives today?`,
          timestamp: new Date().toISOString(),
        }];
      }

      setMessages(initialHistory);

      const newChat = await startChatAsync(
        GEMINI_FLASH_MODEL, 
        selectedProvider, 
        SYSTEM_INSTRUCTION,
        initialHistory, 
        useKnowledgeBase && !!kbName, // Pass boolean for useKnowledgeBase
        kbName || undefined // Pass kbName if it exists, otherwise undefined
      );
      
      setChatSession(newChat);
      setLoading(false);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError(`Connection failed with ${selectedProvider}. Please verify settings.`);
      setLoading(false);
    }
  }, [selectedProvider, useKnowledgeBase, kbName]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;
    abortControllerRef.current = new AbortController();

    const newUserMessage: ChatMessageType = { role: 'user', text: text, timestamp: new Date().toISOString() };
    const newModelMessage: ChatMessageType = { role: 'model', text: '', timestamp: new Date().toISOString() };

    setMessages((prev) => [...prev, newUserMessage, newModelMessage]);
    setLoading(true);
    setError(null);

    try {
      await sendMessageToChat(
        chatSession, 
        text, 
        (partialText) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            if (newMessages[lastMsgIndex].role === 'model') {
               newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: partialText };
            }
            return newMessages;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError('Processing error. Please try again.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatSession]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  const handleClearChat = () => {
    if (window.confirm('Clear session history? This action cannot be undone.')) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]); 
      initChat();
    }
  };

  const handleFillInput = (prompt: string) => setInputText(prompt);

  return (
    <div className="flex h-full bg-background relative overflow-hidden rounded-tl-xl border-l border-t border-gray-200">
      
      {/* Left Sidebar (Desktop) - Suggestions */}
      <aside className="hidden md:flex flex-col w-72 bg-surface border-r border-gray-200 h-full flex-none z-10">
        <div className="p-5 border-b border-gray-200">
           <h2 className="text-xs font-bold text-title uppercase tracking-wider flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-primary" />
              Quick Actions
           </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
           {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleFillInput(prompt)}
                className="w-full text-left px-3 py-2.5 text-sm text-body hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 truncate"
                title={prompt}
              >
                {prompt}
              </button>
           ))}
           
           <div className="pt-6 pb-2 px-1">
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                 <LightBulbIcon className="w-3.5 h-3.5" />
                 Inspiration
              </h3>
           </div>
            {SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={`sug-${idx}`}
                onClick={() => handleSendMessage(suggestion)}
                className="w-full text-left px-3 py-3 text-xs text-muted hover:text-primary bg-background/50 hover:bg-background border border-gray-100 dark:border-gray-800 rounded-lg transition-all mb-2.5 line-clamp-3 leading-relaxed"
              >
                "{suggestion}"
              </button>
           ))}
        </div>
        
        {/* Knowledge Base Status in Sidebar */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-900/20">
            {selectedProvider === 'Google Gemini' && kbName ? (
              <button 
                onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors border ${
                  useKnowledgeBase 
                    ? 'bg-success/10 text-success border-success/20' 
                    : 'bg-white dark:bg-gray-800 text-muted border-gray-200 dark:border-gray-700'
                }`}
              >
                 <div className="flex items-center gap-2">
                   <CircleStackIcon className="w-4 h-4" />
                   Knowledge Base
                 </div>
                 <div className={`w-2 h-2 rounded-full ${useKnowledgeBase ? 'bg-success' : 'bg-gray-300'}`}></div>
              </button>
            ) : (
               <div className="text-center">
                  <p className="text-[10px] text-muted mb-2">Connect a Knowledge Base in Library to enable grounding.</p>
               </div>
            )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        
        {/* Header */}
        <header className="flex-none bg-surface/80 backdrop-blur-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <ChatBubbleLeftRightIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-title leading-none">AI Chat Interface</h1>
              <div className="flex items-center gap-1 mt-0.5">
                 <span className="text-[10px] text-muted font-medium">Provider:</span>
                 <select 
                    value={selectedProvider} 
                    onChange={(e) => setSelectedProvider(e.target.value as ProviderName)}
                    className="text-[10px] font-semibold text-primary bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:underline"
                 >
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="p-1.5 text-muted hover:text-error hover:bg-red-50 rounded-md transition-colors"
            title="Clear Chat History"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </header>

        {/* Messages */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto relative"
        >
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-full">
            {messages.map((msg, index) => (
               (msg.text || index === messages.length - 1) && <ChatMessage key={index} message={msg} />
            ))}

            {loading && messages.length > 0 && !messages[messages.length - 1].text && (
              <div className="pl-2 mb-8"><TypingIndicator /></div>
            )}

            {/* Empty State / Suggestions (Mobile Only or Minimal Desktop) */}
            {messages.length === 1 && !loading && (
               <div className="mt-auto mb-10 flex flex-col items-center justify-center text-center opacity-60">
                 <SparklesIcon className="w-12 h-12 text-gray-300 mb-3" />
                 <p className="text-sm text-muted max-w-xs">
                    Start a conversation by typing a message or selecting a prompt {window.innerWidth >= 768 ? 'from the sidebar' : 'below'}.
                 </p>
                 
                 {/* Mobile Suggestions Grid */}
                 <div className="grid md:hidden grid-cols-1 gap-2 mt-8 w-full">
                   {QUICK_PROMPTS.slice(0, 4).map((suggestion, idx) => (
                     <button
                       key={idx}
                       onClick={() => handleFillInput(suggestion)}
                       className="p-3 text-sm text-body bg-surface border border-gray-200 rounded-lg hover:border-primary shadow-sm"
                     >
                       {suggestion}
                     </button>
                   ))}
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-none bg-surface border-t border-gray-200 p-4 md:p-6 z-20">
          <div className="max-w-3xl mx-auto w-full relative">
             {error && (
              <div className="absolute -top-14 left-0 right-0 mx-auto w-fit bg-red-100 text-red-800 text-xs px-4 py-2 rounded-full shadow-sm border border-red-200 flex items-center gap-2">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold hover:text-red-900">&times;</button>
              </div>
            )}
            
            <ChatInput 
              onSend={handleSendMessage} 
              onStop={handleStopGeneration}
              isLoading={loading} 
              disabled={!chatSession} 
              value={inputText}
              onChange={setInputText}
            />
            
            {/* Quick Prompts (Mobile Only Horizontal Scroll) */}
            <div className="mt-4 flex md:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
               {QUICK_PROMPTS.map((prompt, idx) => (
                 <button
                   key={idx}
                   onClick={() => handleFillInput(prompt)}
                   className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-body active:bg-primary active:text-white transition-all flex-shrink-0 font-medium"
                 >
                   {prompt}
                 </button>
               ))}
            </div>
            
            <p className="hidden md:block text-center text-[10px] text-muted mt-3">
               AI responses may be inaccurate. Verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;