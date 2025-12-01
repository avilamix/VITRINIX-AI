
import { CalendarEvent } from '../types';

// Mock database for calendar events
let mockEvents: CalendarEvent[] = [
  {
    id: 'evt-1',
    summary: 'Reunião de Marketing',
    description: 'Alinhamento semanal da equipe.',
    startTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] + 'T10:00:00', // Amanhã 10h
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] + 'T11:00:00',
    location: 'Google Meet',
  },
  {
    id: 'evt-2',
    summary: 'Lançamento da Campanha',
    startTime: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0] + 'T14:00:00', // Depois de amanhã 14h
    endTime: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0] + 'T15:00:00',
  }
];

export const calendarService = {
  listEvents: async (): Promise<CalendarEvent[]> => {
    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockEvents];
  },

  addEvent: async (summary: string, startTime: string, endTime: string, description?: string): Promise<CalendarEvent> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      summary,
      startTime,
      endTime,
      description,
    };
    mockEvents.push(newEvent);
    return newEvent;
  },

  deleteEvent: async (eventId: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const initialLength = mockEvents.length;
    mockEvents = mockEvents.filter(e => e.id !== eventId);
    
    if (mockEvents.length === initialLength) {
      throw new Error(`Evento com ID ${eventId} não encontrado.`);
    }
    return "Evento removido com sucesso.";
  },
  
  // Helper para o Tool Definition
  getToolDeclarations: () => {
    return [
      {
        name: 'list_events',
        description: 'Lista todos os eventos agendados no calendário do usuário.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        }
      },
      {
        name: 'add_event',
        description: 'Adiciona um novo evento ao calendário.',
        parameters: {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING', description: 'O título ou resumo do evento.' },
            startTime: { type: 'STRING', description: 'Data e hora de início no formato ISO 8601 (ex: 2023-10-27T10:00:00).' },
            endTime: { type: 'STRING', description: 'Data e hora de término no formato ISO 8601.' },
            description: { type: 'STRING', description: 'Descrição opcional do evento.' },
          },
          required: ['summary', 'startTime', 'endTime']
        }
      },
      {
        name: 'delete_event',
        description: 'Remove um evento do calendário pelo ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            eventId: { type: 'STRING', description: 'O ID do evento a ser removido.' },
          },
          required: ['eventId']
        }
      }
    ];
  }
};
