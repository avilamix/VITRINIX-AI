
import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { startChatWithFunctions } from '../services/geminiService';
import { calendarService } from '../services/calendarService';
import { ChatMessage, CalendarEvent } from '../types';
import ChatMessageComponent from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import { 
  PaperAirplaneIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  TrashIcon, 
  MapPinIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';

const SYSTEM_INSTRUCTION = `Você é um assistente pessoal executivo (VitrineX Calendar) que gerencia a agenda do usuário.
Você tem acesso a ferramentas para listar, adicionar e remover eventos.
Sempre que o usuário pedir algo relacionado à agenda, use a ferramenta apropriada.
Se o usuário pedir para agendar, pergunte detalhes faltantes (data, hora, resumo) se necessário.
Seja profissional, conciso e sempre confirme as ações realizadas.
Hoje é ${new Date().toLocaleDateString()}.`;

const CalendarManager: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const refreshEvents = async () => {
    setEventsLoading(true);
    try {
      const data = await calendarService.listEvents();
      setEvents(data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    } catch (error) {
      console.error(error);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    refreshEvents();
    const initChat = async () => {
      const tools = [{ functionDeclarations: calendarService.getToolDeclarations() }];
      const newChat = await startChatWithFunctions(tools, SYSTEM_INSTRUCTION);
      setChat(newChat);
      setMessages([{
        role: 'model',
        text: 'Olá. Sou seu gerenciador de agenda. Posso listar seus compromissos, agendar reuniões ou cancelar eventos. Como posso ajudar hoje?',
        timestamp: new Date().toISOString()
      }]);
    };
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chat) return;

    const userMsg: ChatMessage = { role: 'user', text: inputText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      let currentMsg = userMsg.text;
      let finished = false;

      while (!finished) {
        const result = await chat.sendMessage({ message: currentMsg });
        const response = result.response;
        const functionCalls = response.functionCalls;
        
        if (functionCalls && functionCalls.length > 0) {
          for (const call of functionCalls) {
            setMessages(prev => [...prev, {
              role: 'tool',
              text: `Ferramenta: ${call.name}`,
              timestamp: new Date().toISOString(),
              toolCall: { name: call.name, args: call.args }
            }]);

            let functionResponse;
            try {
              if (call.name === 'list_events') {
                const list = await calendarService.listEvents();
                functionResponse = { result: list };
                refreshEvents();
              } else if (call.name === 'add_event') {
                const { summary, startTime, endTime, description } = call.args as any;
                const newEvent = await calendarService.addEvent(summary, startTime, endTime, description);
                functionResponse = { result: `Evento criado com sucesso: ${newEvent.summary}` };
                refreshEvents();
                addToast({ type: 'success', title: 'Agendado', message: `Evento "${summary}" criado.` });
              } else if (call.name === 'delete_event') {
                const { eventId } = call.args as any;
                const msg = await calendarService.deleteEvent(eventId);
                functionResponse = { result: msg };
                refreshEvents();
                addToast({ type: 'info', title: 'Removido', message: 'Evento excluído da agenda.' });
              } else {
                functionResponse = { error: `Function ${call.name} not found` };
              }
            } catch (err: any) {
              functionResponse = { error: err.message };
            }
            
            // Simulação de resposta da tool para o modelo (em um fluxo real seria sendToolResponse)
            currentMsg = `[System Tool Output for ${call.name}]: ${JSON.stringify(functionResponse)}`;
          }
        } else {
          setMessages(prev => [...prev, {
            role: 'model',
            text: response.text || 'Ação concluída.',
            timestamp: new Date().toISOString()
          }]);
          finished = true;
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, ocorreu um erro na comunicação.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-background overflow-hidden">
      
      {/* Left Panel: Chat Interface */}
      <div className="flex-1 flex flex-col h-full border-r border-border bg-surface/50">
        <header className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
               <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-title">Assistente de Agenda</h2>
              <p className="text-xs text-muted">Powered by Gemini Function Calling</p>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg, idx) => (
            <ChatMessageComponent key={idx} message={msg} />
          ))}
          {loading && <div className="pl-4"><TypingIndicator /></div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-surface border-t border-border">
          <form onSubmit={handleSendMessage} className="relative max-w-3xl mx-auto">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ex: Agendar reunião de estratégia amanhã às 14h..."
                className="w-full pl-5 pr-14 py-3.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-body shadow-sm transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="absolute right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel: Calendar Events */}
      <div className="w-full lg:w-[400px] xl:w-[450px] bg-background flex flex-col h-full border-l border-border shadow-xl z-20">
        <div className="p-5 border-b border-border bg-surface flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-title flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-primary" />
            Próximos Eventos
          </h3>
          <button onClick={refreshEvents} className="text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
             Atualizar
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-background/50">
          {eventsLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted space-y-2">
               <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
               <span className="text-xs uppercase tracking-wider">Sincronizando...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 px-6 border-2 border-dashed border-border rounded-xl">
               <CalendarDaysIcon className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
               <p className="text-title font-medium">Agenda Livre</p>
               <p className="text-xs text-muted mt-1">Nenhum evento agendado para os próximos dias.</p>
            </div>
          ) : (
            events.map(event => {
              const startDate = new Date(event.startTime);
              const endDate = new Date(event.endTime);
              const isToday = startDate.toDateString() === new Date().toDateString();
              
              return (
                <div key={event.id} className="group bg-surface border border-border p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 relative overflow-hidden">
                  {isToday && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent -mr-8 -mt-8 rounded-full pointer-events-none"></div>}
                  
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${isToday ? 'bg-primary text-white shadow-sm' : 'bg-secondary/10 text-secondary'}`}>
                          {isToday ? 'Hoje' : startDate.toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                        <span className="text-xs text-muted font-mono">
                          {startDate.toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-title text-base leading-tight">{event.summary}</h4>
                    </div>
                    <button 
                      onClick={() => {
                        if(window.confirm(`Excluir "${event.summary}"?`)) {
                           calendarService.deleteEvent(event.id).then(() => {
                             refreshEvents();
                             addToast({ type: 'info', message: 'Evento excluído.' });
                           });
                        }
                      }}
                      className="text-muted hover:text-error p-1.5 hover:bg-error/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir Evento"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-body">
                      <ClockIcon className="w-3.5 h-3.5 text-primary" />
                      {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted truncate max-w-[150px]">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-xs text-muted mt-2 bg-background/50 p-2 rounded-md border border-border/50">
                      {event.description}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarManager;
    