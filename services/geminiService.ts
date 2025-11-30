

import {
  GoogleGenAI,
  GenerateContentResponse,
  VideoGenerationReferenceImage,
  Type,
  FunctionDeclaration,
  Chat,
  LiveServerMessage,
  Blob,
  Content,
  File as GenAIFile,
  Modality
} from '@google/genai';
import {
  GEMINI_FLASH_MODEL, // Mantidos como sugestões de modelo, mas o backend decide o padrão
  GEMINI_PRO_MODEL,
  GEMINI_IMAGE_FLASH_MODEL,
  GEMINI_IMAGE_PRO_MODEL,
  VEO_FAST_GENERATE_MODEL,
  VEO_GENERATE_MODEL,
  GEMINI_LIVE_AUDIO_MODEL,
  GEMINI_TTS_MODEL,
} from '../constants';
import {
  UserProfile,
  Post,
  Ad,
  Campaign,
  Trend,
  ProviderName,
  ChatMessage,
  KnowledgeBaseQueryResponse,
  OrganizationMembership,
} from '../types';
import { getFirebaseIdToken, getActiveOrganization } from './authService';

// TODO: Em um sistema real, a URL do backend viria de uma variável de ambiente ou configuração global
const BACKEND_URL = 'http://localhost:3000'; // Exemplo para desenvolvimento

// Helper para obter o ID da organização ativa
const getActiveOrganizationId = (): string => {
  const activeOrg: OrganizationMembership | undefined = getActiveOrganization();
  if (!activeOrg) {
    throw new Error('No active organization found. Please login and select an organization.');
  }
  return activeOrg.organization.id;
};

// Helper para fazer requisições ao backend AI Proxy
async function fetchAiProxy<T>(
  endpoint: string,
  method: string = 'POST',
  body?: any,
): Promise<T> {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/ai-proxy/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `AI Proxy call failed: ${response.statusText}`);
  }
  return response.json();
}

// Helper para fazer requisições à Knowledge Base do backend
async function fetchKnowledgeBase<T>(
  endpoint: string,
  method: string = 'POST',
  body?: any,
): Promise<T> {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/knowledge-base/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Knowledge Base API call failed: ${response.statusText}`);
  }
  return response.json();
}

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any; // GenerateContentParameters['config']['responseSchema'];
  tools?: any[]; // GenerateContentParameters['config']['tools'];
  thinkingBudget?: number;
  provider?: ProviderName; // Allow specifying provider
}

export const generateText = async (
  prompt: string,
  options?: GenerateTextOptions,
): Promise<string> => {
  const {
    model = GEMINI_FLASH_MODEL,
    systemInstruction,
    responseMimeType,
    responseSchema,
    tools,
    thinkingBudget,
    provider = 'Google Gemini',
  } = options || {};

  if (provider !== 'Google Gemini') {
    // Fallback para provedores não Gemini (simulado)
    console.log(`Simulating ${provider} generation...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `[Simulated Response from ${provider}]: ${prompt.substring(0, 50)}... This is a mock response.`;
  }

  // Chamar o backend AI Proxy
  const body = {
    prompt,
    model,
    options: {
      temperature: 0.7, // Padrão
      topP: 0.95,       // Padrão
      maxOutputTokens: 1024, // Padrão
      ...(thinkingBudget !== undefined && { thinkingConfig: { thinkingBudget } }),
      // Outras opções devem ser passadas via 'config' do call-gemini ou DTO específico
    },
    tools,
  };

  const response = await fetchAiProxy<{ text: string }>('generate-text', 'POST', body);
  return response.text;
};

export interface GenerateImageOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  tools?: any[]; // GenerateContentParameters['config']['tools'];
  provider?: ProviderName;
}

export const generateImage = async (
  prompt: string,
  options?: GenerateImageOptions,
): Promise<{ imageUrl?: string; text?: string }> => {
  const {
    model = GEMINI_IMAGE_FLASH_MODEL,
    aspectRatio,
    imageSize,
    tools,
    provider = 'Google Gemini'
  } = options || {};

  if (provider !== 'Google Gemini') {
    return { text: `Image generation for ${provider} is not fully implemented in this demo.` };
  }

  const body = {
    prompt,
    model,
    imageConfig: {
      aspectRatio,
      imageSize,
    },
    // Ferramentas ou outras opções podem ser adicionadas aqui se o DTO do backend as suportar
  };

  try {
    const response = await fetchAiProxy<{ base64Image: string; mimeType: string }>('generate-image', 'POST', body);
    return { imageUrl: `data:${response.mimeType};base64,${response.base64Image}` };
  } catch (error: any) {
    if (error.message?.includes('No image part found')) {
      return { text: 'AI did not generate an image, possibly due to safety or content issues.' };
    }
    throw error;
  }
};

export const editImage = async (
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  model: string = GEMINI_IMAGE_FLASH_MODEL,
): Promise<{ imageUrl?: string; text?: string }> => {
  // Para edição, podemos reutilizar a geração de imagem passando a imagem base64 como parte do prompt
  // ou criar um endpoint específico no backend para 'edit-image'.
  // Por simplicidade, faremos uma nova geração que considera a imagem existente.
  // Isso requer que o backend tenha um endpoint multimodal flexível.
  // Por enquanto, faremos uma chamada a `call-gemini` com a imagem inline.

  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  const body = {
    model: model,
    contents: [
      { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }] },
      { parts: [{ text: prompt }] },
    ],
    config: {
      // Adicionar config de imagem se o modelo suportar
    },
  };

  try {
    const apiResponse = await fetchAiProxy<any>('call-gemini', 'POST', body);
    const imagePart = apiResponse.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (imagePart) {
      return { imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
    }
    return { text: apiResponse.response.text || 'No image edited.' };
  } catch (error: any) {
    console.error('Error editing image via backend:', error);
    return { text: `Failed to edit image: ${error.message}` };
  }
};

export interface GenerateVideoOptions {
  model?: string;
  image?: { imageBytes: string; mimeType: string };
  lastFrame?: { imageBytes: string; mimeType: string };
  referenceImages?: VideoGenerationReferenceImage[];
  config?: any; // videoConfig
}

export const generateVideo = async (
  prompt: string,
  options?: GenerateVideoOptions,
): Promise<string> => {
  const {
    model = VEO_FAST_GENERATE_MODEL,
    image,
    lastFrame,
    referenceImages,
    config, // This is videoConfig
  } = options || {};

  const body = {
    prompt,
    model,
    image,
    lastFrame,
    referenceImages,
    videoConfig: config,
  };

  const response = await fetchAiProxy<{ videoUri: string }>('generate-video', 'POST', body);
  return response.videoUri;
};

// --- Analysis Functions ---
export const analyzeImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  const body = {
    model: model,
    contents: [
      { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }] },
      { parts: [{ text: prompt }] },
    ],
    config: {
      generationConfig: { thinkingConfig: { thinkingBudget: 32768 } },
    },
  };

  const apiResponse = await fetchAiProxy<any>('call-gemini', 'POST', body);
  return apiResponse.response.text || 'No analysis generated.';
};

export const analyzeVideo = async (
  videoUrl: string, // Assumindo que videoUrl é um URI acessível publicamente (e.g. GCS)
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  // Para análise de vídeo, Gemini geralmente espera um URI, não inlineData para arquivos grandes.
  // O backend deve lidar com o upload para Gemini Files API se necessário.
  // Por ora, passaremos o URI e o backend decidirá como tratar.
  const body = {
    model: model,
    contents: [
      { parts: [{ fileData: { fileUri: videoUrl, mimeType: 'video/mp4' } }] },
      { parts: [{ text: prompt }] },
    ],
    config: {
      generationConfig: { thinkingConfig: { thinkingBudget: 32768 } },
    },
  };

  const apiResponse = await fetchAiProxy<any>('call-gemini', 'POST', body);
  return apiResponse.response.text || 'No analysis generated.';
};

// --- AI Manager Strategy ---
export const aiManagerStrategy = async (
  prompt: string,
  userProfile: UserProfile['businessProfile'],
): Promise<{ strategyText: string; suggestions: string[] }> => {
  const systemInstruction = `You are a marketing expert for a business in the ${userProfile.industry} industry, targeting ${userProfile.targetAudience}. Your goal is to provide a comprehensive marketing diagnosis, identify failures, and suggest campaign ideas and sales funnels. Adopt a ${userProfile.visualStyle} tone.`;

  const body = {
    model: GEMINI_PRO_MODEL,
    contents: [{ parts: [{ text: `Diagnose the marketing for my business: ${prompt}. Also, provide actionable suggestions for campaigns and sales funnels.` }] }],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strategyText: { type: Type.STRING },
          campaignSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          salesFunnelSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['strategyText', 'campaignSuggestions', 'salesFunnelSuggestions'],
      },
      tools: [{ googleSearch: {} }],
      generationConfig: { thinkingConfig: { thinkingBudget: 32768 } },
    },
  };

  const apiResponse = await fetchAiProxy<any>('call-gemini', 'POST', body);
  const jsonStr = apiResponse.response.text?.trim();
  if (jsonStr) {
    try {
      const result = JSON.parse(jsonStr);
      return {
        strategyText: result.strategyText,
        suggestions: [
          ...(result.campaignSuggestions || []),
          ...(result.salesFunnelSuggestions || []),
        ],
      };
    } catch (e) {
      console.error('Failed to parse JSON response for strategy:', e, jsonStr);
      return { strategyText: jsonStr, suggestions: [] }; // Return raw text if JSON fails
    }
  }
  return { strategyText: 'No strategy generated.', suggestions: [] };
};

// --- Search Trends (Grounding) ---
export const searchTrends = async (
  query: string,
  location?: { latitude: number; longitude: number },
): Promise<Trend[]> => {
  const contents = [{ parts: [{ text: `Find current marketing trends for "${query}". Provide a summary and real sources.` }] }];
  const tools = [{ googleSearch: {} }];
  let toolConfig: any = {};

  if (location) {
    tools.push({ googleMaps: {} } as any);
    toolConfig = { retrievalConfig: { latLng: location } };
  }

  const body = {
    model: GEMINI_FLASH_MODEL,
    contents: contents,
    config: {
      tools: tools,
      toolConfig: toolConfig,
    },
  };

  const apiResponse = await fetchAiProxy<any>('call-gemini', 'POST', body);
  const text = apiResponse.response.text;
  const groundingChunks = apiResponse.response.groundingMetadata?.groundingChunks || [];

  const trends: Trend[] = [
    {
      id: `trend-${Date.now()}`,
      query: query,
      score: Math.floor(Math.random() * 100) + 1,
      data: text || 'No trend data found.',
      sources: groundingChunks
        .filter((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
        .map((chunk: any) => ({
          uri: chunk.web?.uri || chunk.maps?.uri!,
          title: chunk.web?.title || chunk.maps?.title || 'External Source',
        })),
      createdAt: new Date().toISOString(),
      userId: 'mock-user-123',
    },
  ];
  return trends;
};

// --- Campaign Builder ---
export const campaignBuilder = async (
  campaignPrompt: string,
): Promise<{ campaign: Campaign; videoUrl?: string }> => {
  // Step 1: Generate campaign plan (via backend)
  const textPlanBody = {
    model: GEMINI_PRO_MODEL,
    contents: [{ parts: [{ text: `Create a detailed marketing campaign plan for: "${campaignPrompt}".
          The plan should include 10 social media post ideas (with text content), 5 ad ideas (with headline and copy),
          and a chronological timeline. Return as JSON.` }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          campaignName: { type: Type.STRING },
          posts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content_text: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['content_text', 'keywords'],
            },
          },
          ads: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING, enum: ['Instagram', 'Facebook', 'TikTok', 'Google', 'Pinterest'] },
                headline: { type: Type.STRING },
                copy: { type: Type.STRING },
              },
              required: ['platform', 'headline', 'copy'],
            },
          },
          timeline: { type: Type.STRING },
        },
        required: ['campaignName', 'posts', 'ads', 'timeline'],
      },
      generationConfig: { thinkingConfig: { thinkingBudget: 32768 } },
    },
  };

  const textPlanResponse = await fetchAiProxy<any>('call-gemini', 'POST', textPlanBody);
  const plan = JSON.parse(textPlanResponse.response.text);

  // Step 2: Generate Video (via backend)
  const videoPrompt = `A short promotional video for the campaign "${plan.campaignName}", focusing on a dynamic visual style based on this description: "${campaignPrompt}".`;
  const videoBody = {
    prompt: videoPrompt,
    model: VEO_GENERATE_MODEL,
    videoConfig: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
    },
  };
  const videoResponse = await fetchAiProxy<{ videoUri: string }>('generate-video', 'POST', videoBody);
  const videoUrl = videoResponse.videoUri;

  // Step 3: Integrate
  const campaignId = `campaign-${Date.now()}`;
  const generatedPosts: Post[] = plan.posts.map((p: any, index: number) => ({
    id: `${campaignId}-post-${index}`,
    userId: 'mock-user-123',
    content_text: p.content_text,
    createdAt: new Date().toISOString(),
    tags: p.keywords,
  }));

  const generatedAds: Ad[] = plan.ads.map((a: any, index: number) => ({
    id: `${campaignId}-ad-${index}`,
    userId: 'mock-user-123',
    platform: a.platform,
    headline: a.headline,
    copy: a.copy,
    createdAt: new Date().toISOString(),
  }));

  const campaign: Campaign = {
    id: campaignId,
    userId: 'mock-user-123',
    name: plan.campaignName,
    type: 'general',
    posts: generatedPosts,
    ads: generatedAds,
    video_url: videoUrl,
    timeline: plan.timeline,
    createdAt: new Date().toISOString(),
  };

  return { campaign, videoUrl };
};

// --- File Search Functions (REFATORADAS PARA CHAMAR O BACKEND) ---
export const createFileSearchStore = async (displayName?: string): Promise<any> => {
  return fetchKnowledgeBase('store', 'POST', { displayName });
};

export const getFileSearchStore = async (): Promise<any> => {
  return fetchKnowledgeBase('store', 'GET');
};

interface UploadFileMetadata {
  documentType?: string;
  campaign?: string;
  sector?: string;
  client?: string;
}

export const uploadFileToSearchStore = async (file: File, metadata: UploadFileMetadata): Promise<any> => {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  const formData = new FormData();
  formData.append('file', file);
  if (metadata.documentType) formData.append('documentType', metadata.documentType);
  if (metadata.campaign) formData.append('campaign', metadata.campaign);
  if (metadata.sector) formData.append('sector', metadata.sector);
  if (metadata.client) formData.append('client', metadata.client);

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/knowledge-base/upload-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to upload file to File Search Store: ${response.statusText}`);
  }
  return response.json();
};

export const queryFileSearchStore = async (
  prompt: string,
  model: string = GEMINI_FLASH_MODEL
): Promise<KnowledgeBaseQueryResponse> => {
  return fetchKnowledgeBase('query', 'POST', { prompt, model });
};

// --- Chatbot Functions ---
// `startChat` foi refatorado para ser assíncrono e chamar o backend
export const startChatAsync = async (
  model: string = GEMINI_FLASH_MODEL,
  provider: ProviderName = 'Google Gemini',
  systemInstruction?: string,
  history?: ChatMessage[],
  useKnowledgeBase?: boolean,
  kbStoreName?: string
): Promise<Chat> => {
  // Para provedores não Gemini ou Gemini sem KB, mantém mock ou lógica de frontend.
  // Se o backend for responsável por *todos* os chats, esta lógica mudaria.
  // Por simplicidade na refatoração, apenas o chat com KB é roteado para o backend.
  if (provider !== 'Google Gemini' || !useKnowledgeBase || !kbStoreName) {
    return {
      sendMessageStream: async ({ message }: { message: string }) => {
        return (async function* () {
          await new Promise(r => setTimeout(r, 500));
          yield { text: `[${provider} Response]: I am a simulated ${provider} agent. ` } as GenerateContentResponse;
          await new Promise(r => setTimeout(r, 500));
          yield { text: `My integration is being mocked or running without Knowledge Base.` } as GenerateContentResponse;
        })();
      }
    } as unknown as Chat;
  }

  // Lógica para Gemini COM grounding KB (via Backend)
  return {
    sendMessageStream: async ({ message }: { message: string }) => {
      return (async function* () {
        const organizationId = getActiveOrganizationId();
        const idToken = await getFirebaseIdToken();

        const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/knowledge-base/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ prompt: message, model }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          yield { text: `Error: ${errorData.message || response.statusText}` } as GenerateContentResponse;
        } else {
          const data: KnowledgeBaseQueryResponse = await response.json();
          let fullResponseText = data.resposta;

          if (data.trechos_referenciados && data.trechos_referenciados.length > 0) {
            fullResponseText += `\n\n**Trechos Referenciados**:\n${data.trechos_referenciados.map(s => `"${s}"`).join('\n')}`;
          }
          if (data.arquivos_usados && data.arquivos_usados.length > 0) {
            fullResponseText += `\n\n**Fontes**: ${data.arquivos_usados.join(', ')}`;
          }
          fullResponseText += `\n\n*(Confiança: ${data.confianca.toFixed(2)})*`;

          yield { text: fullResponseText } as GenerateContentResponse;
        }
      })();
    },
  } as unknown as Chat;
};

export const sendMessageToChat = async (
  chat: Chat,
  message: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  if (signal?.aborted) return "";

  try {
    const responseIterable = chat.sendMessageStream({ message: message });
    let fullText = '';

    for await (const chunk of responseIterable) {
      if (signal?.aborted) break;
      const chunkText = chunk.text;
      fullText += chunkText;
      if (onChunk) onChunk(fullText);
    }

    return fullText;
  } catch (error) {
    if (signal?.aborted) return "";
    console.error('Error sending message to chat:', error);
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- TTS Functions ---
export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  model: string = GEMINI_TTS_MODEL,
): Promise<string | undefined> => {
  const body = {
    text,
    model,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: voiceName },
      },
    },
  };

  try {
    const response = await fetchAiProxy<{ base64Audio: string; mimeType: string }>('generate-speech', 'POST', body);
    return response.base64Audio;
  } catch (error) {
    console.error('Error generating speech via backend:', error);
    throw error;
  }
};

// --- Live API Functions ---
// A API Live é uma integração de WebSockets em tempo real que é complexa de proxyar de forma transparente
// sem adicionar latência ou complexidade significativa de backend para WebSockets.
// Para esta demo e seguindo as diretrizes de "não quebrar integrações" e "ambiente de execução",
// manteremos a inicialização direta no frontend, mas garantindo que a API Key seja obtida conforme as regras.
// O `process.env.API_KEY` é esperado ser preenchido pelo ambiente de execução.
// Se `window.aistudio` estiver disponível, ele pode fornecer uma chave selecionada pelo usuário.

export interface LiveSessionCallbacks {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => Promise<void> | void;
  onerror: (error: ErrorEvent) => void;
  onclose: (event: CloseEvent) => void;
  onTranscriptionUpdate: (input: string, output: string) => void;
  onTurnComplete: (input: string, output: string) => void;
}

// Helper para obter a chave API para o Live API (pode vir de process.env ou window.aistudio)
async function getLiveApiKey(): Promise<string> {
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (selected) {
        // Assume process.env.API_KEY é atualizado pelo window.aistudio.openSelectKey()
        return process.env.API_KEY || ''; 
      }
    } catch (error) {
      console.warn("Error checking window.aistudio API key, falling back to process.env.API_KEY", error);
    }
  }
  
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  throw new Error('No API key available for Live Conversation. Please connect your API key.');
}

export const connectLiveSession = async (
  callbacks: LiveSessionCallbacks,
  systemInstruction?: string,
  tools?: { functionDeclarations?: FunctionDeclaration[] }[]
) => {
  const apiKey = await getLiveApiKey(); // Usa a função auxiliar para obter a chave
  if (!apiKey) {
    throw new Error("API Key is missing for Live Conversation.");
  }
  const ai = new GoogleGenAI({ apiKey });

  let currentInputTranscription = '';
  let currentOutputTranscription = '';

  const sessionPromise = ai.live.connect({
    model: GEMINI_LIVE_AUDIO_MODEL,
    callbacks: {
      onopen: () => {
        console.debug('Live session opened.');
        callbacks.onopen();
      },
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
          currentOutputTranscription += message.serverContent.outputTranscription.text;
          callbacks.onTranscriptionUpdate(currentInputTranscription, currentOutputTranscription);
        } else if (message.serverContent?.inputTranscription) {
          currentInputTranscription += message.serverContent.inputTranscription.text;
          callbacks.onTranscriptionUpdate(currentInputTranscription, currentOutputTranscription);
        }

        if (message.serverContent?.turnComplete) {
          callbacks.onTurnComplete(currentInputTranscription, currentOutputTranscription);
          currentInputTranscription = '';
          currentOutputTranscription = '';
        }

        if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls) {
            const result = "ok";
            sessionPromise.then((session) => {
              session.sendToolResponse({
                functionResponses: {
                  id: fc.id,
                  name: fc.name,
                  response: { result: result },
                }
              });
            });
          }
        }
        await callbacks.onmessage(message);
      },
      onerror: (e: ErrorEvent) => {
        console.error('Live conversation error:', e);
        callbacks.onerror(e);
      },
      onclose: (e: CloseEvent) => {
        console.debug('Live conversation closed:', e);
        callbacks.onclose(e);
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: systemInstruction,
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      tools: tools,
    },
  });

  return sessionPromise;
};

// Internal helpers (re-exported)

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
