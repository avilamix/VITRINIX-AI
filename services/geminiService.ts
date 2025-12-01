
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
  Modality,
  Tool,
  Part
} from '@google/genai';
import {
  GEMINI_FLASH_MODEL,
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
  GeminiPart,
  PlaceResult,
} from '../types';
import { getFirebaseIdToken, getActiveOrganization } from './authService';

// URL do Backend mantida para funcionalidades estritamente de servidor (Auth, DB)
const BACKEND_URL = 'http://localhost:3000';
const LOCAL_KB_STORAGE_KEY = 'vitrinex_kb_local_content';

// Singleton instance cache
let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

// Helper para obter a chave API com prioridade e fallback robusto
async function getApiKey(): Promise<string> {
  let apiKey = '';

  // 1. Tentar Environment Variables (Build/Server inject) - Padrão Google
  if (process.env.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
  } else if (process.env.GOOGLE_API_KEY) {
    apiKey = process.env.GOOGLE_API_KEY;
  } else if (process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }

  // 2. Tentar AI Studio Window Injection (se env falhar)
  if (!apiKey && (window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
    try {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      if (selected) {
        // Em ambiente IDX/AI Studio, a chave pode ser injetada automaticamente ou estar em process.env após seleção
        apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || ''; 
      }
    } catch (error) {
      console.warn("GeminiService: Erro ao verificar window.aistudio", error);
    }
  }

  // 3. Tentar Local Storage (Entrada Manual do Usuário) - Fallback final
  if (!apiKey) {
    const localKey = localStorage.getItem('vitrinex_gemini_api_key');
    if (localKey) {
      apiKey = localKey;
    }
  }
  
  if (!apiKey) {
    console.error("GeminiService: Nenhuma chave de API encontrada em ENV (GEMINI_API_KEY), AI Studio ou LocalStorage.");
    throw new Error('Chave de API não encontrada. Por favor, conecte sua chave nas configurações ou na tela inicial.');
  }

  return apiKey;
}

// Instância do Cliente GenAI (Singleton Pattern para Performance)
async function getGenAIClient(explicitKey?: string): Promise<GoogleGenAI> {
  const apiKey = explicitKey || await getApiKey();
  
  // Retorna instância cacheada se a chave não mudou e não é uma chave explícita para teste
  if (!explicitKey && cachedClient && cachedApiKey === apiKey) {
    return cachedClient;
  }

  // Reinicializa se a chave mudou ou é a primeira chamada ou é teste
  console.log('GeminiService: Initializing new GoogleGenAI client instance.');
  const client = new GoogleGenAI({ apiKey });
  
  if (!explicitKey) {
    cachedClient = client;
    cachedApiKey = apiKey;
  }
  
  return client;
}

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  tools?: Tool[]; // Correção de tipo para Tool[]
  thinkingBudget?: number;
  provider?: ProviderName;
}

// --- API VERIFICATION (Port of Python Snippet) ---
export const testGeminiConnection = async (explicitKey?: string): Promise<string> => {
  const ai = await getGenAIClient(explicitKey);
  try {
    console.log("Testing Gemini Connection...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Explain how AI works in a few words",
    });
    console.log("Test Response:", response.text);
    return response.text || 'No response text received';
  } catch (error: any) {
    console.error("Connection Test Failed:", error);
    throw new Error(`API Test Failed: ${error.message}`);
  }
};

// --- GERAÇÃO DE TEXTO ---
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
    return `[Simulação ${provider}]: ${prompt.substring(0, 50)}... (Integração direta apenas para Gemini)`;
  }

  const ai = await getGenAIClient();
  
  const config: any = {
    responseMimeType,
    responseSchema,
    tools,
  };

  if (systemInstruction) config.systemInstruction = systemInstruction;
  
  // Thinking budget apenas para modelos suportados (2.5 family mostly)
  if (thinkingBudget && model.includes('2.5')) {
      config.thinkingConfig = { thinkingBudget };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config,
    });

    return response.text || '';
  } catch (error: any) {
    console.error("Gemini API Error (generateText):", error);
    throw new Error(`Erro na IA: ${error.message || 'Falha desconhecida'}`);
  }
};

// --- GERAÇÃO DE IMAGEM ---
export interface GenerateImageOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  tools?: Tool[];
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
    provider = 'Google Gemini'
  } = options || {};

  if (provider !== 'Google Gemini') return { text: `Provider ${provider} not supported.` };

  const ai = await getGenAIClient();

  const config: any = {};
  if (aspectRatio || imageSize) {
    config.imageConfig = {};
    if (aspectRatio) config.imageConfig.aspectRatio = aspectRatio;
    if (imageSize && model.includes('pro')) config.imageConfig.imageSize = imageSize;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        return { imageUrl: `data:${mimeType};base64,${base64}` };
      }
    }
    
    return { text: response.text || 'Nenhuma imagem gerada.' };

  } catch (error: any) {
    console.error("Gemini API Error (generateImage):", error);
    return { text: `Erro ao gerar imagem: ${error.message}` };
  }
};

// --- EDIÇÃO DE IMAGEM ---
export const editImage = async (
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  model: string = GEMINI_IMAGE_FLASH_MODEL,
): Promise<{ imageUrl?: string; text?: string }> => {
  const ai = await getGenAIClient();

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64ImageData, mimeType } },
            { text: prompt }
          ]
        },
      ],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
      }
    }
    return { text: response.text || 'Nenhuma edição retornada.' };
  } catch (error: any) {
    console.error('Error editing image:', error);
    return { text: `Falha na edição: ${error.message}` };
  }
};

// --- GERAÇÃO DE VÍDEO (VEO) ---
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
    config,
  } = options || {};

  const ai = await getGenAIClient();

  const request: any = {
    model,
    prompt,
    config,
  };

  if (image) request.image = image;
  if (lastFrame) request.config.lastFrame = lastFrame;
  if (referenceImages) request.config.referenceImages = referenceImages;

  try {
    let operation = await ai.models.generateVideos(request);
    
    let attempts = 0;
    const maxAttempts = 60; 

    while (!operation.done) {
      if (attempts >= maxAttempts) {
        throw new Error("Tempo limite de geração de vídeo excedido (5 minutos).");
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      attempts++;
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error('Falha ao obter URI do vídeo gerado.');

    const apiKey = await getApiKey();
    return `${downloadLink}&key=${apiKey}`;

  } catch (error: any) {
    console.error("Video Gen Error:", error);
    throw new Error(`Erro ao gerar vídeo: ${error.message}`);
  }
};

// --- ANÁLISE MULTIMODAL ---
export const analyzeImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  const ai = await getGenAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64ImageData, mimeType } },
            { text: prompt }
          ]
        }
      ]
    });

    return response.text || 'Sem análise.';
  } catch (e: any) {
      console.error("Analyze Image Error:", e);
      return `Erro na análise: ${e.message}`;
  }
};

export const analyzeVideo = async (
  videoUrl: string, 
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  return "Análise de vídeo requer upload para Google File API (Feature em desenvolvimento para modo frontend-only).";
};

// --- TRANSCRIÇÃO DE ÁUDIO (STT) ---
export const transcribeAudio = async (
  audioFile: File,
  prompt: string = "Transcreva o áudio a seguir.",
  model: string = GEMINI_FLASH_MODEL
): Promise<string> => {
  const ai = await getGenAIClient();

  // Convert File to Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioFile);
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: audioFile.type, data: base64Data } },
            { text: prompt }
          ]
        }
      ]
    });

    return response.text || "Não foi possível transcrever o áudio.";
  } catch (error: any) {
    console.error("Transcription Error:", error);
    throw new Error(`Erro na transcrição: ${error.message}`);
  }
};

// --- ARCHITECT: ANÁLISE DE CÓDIGO (Simulação de RAG do Codebase) ---
export const queryArchitect = async (query: string): Promise<string> => {
  const projectContext = `
  ESTRUTURA DO PROJETO VITRINEX AI:
  
  FRONTEND (React + Vite + Tailwind):
  - src/App.tsx: Ponto de entrada, roteamento e gestão de chave API.
  - src/pages/: Dashboard, Chatbot, ContentGenerator, AdStudio, Settings, etc.
  - src/services/: geminiService.ts (Cliente SDK @google/genai), authService.ts (Firebase), firestoreService.ts (Mock DB).
  - src/components/: Componentes de UI reutilizáveis (Button, Input, Sidebar, Navbar).
  
  BACKEND (NestJS + Prisma + Postgres):
  - src/app.module.ts: Módulo raiz, Throttler, Config.
  - src/auth/: Autenticação via Firebase Admin.
  - src/ai-proxy/: Proxy para API Gemini, gerenciamento de chaves e logs.
  - src/knowledge-base/: RAG usando Gemini Files API e File Search.
  - src/organizations/: Multi-tenancy.
  
  BANCO DE DADOS (Prisma Schema):
  - Models: User, Organization, OrganizationMember, ApiKey, File.
  - Relacionamentos: User N:N Organization, Organization 1:N ApiKey, Organization 1:N File.
  
  TECNOLOGIAS CHAVE:
  - IA: Google Gemini 2.5 Flash, Pro, Veo (Vídeo), Imagen (Imagem).
  - SDK: @google/genai (Frontend & Backend).
  - Styling: Tailwind CSS (Tema Slate/Indigo).
  `;

  const response = await generateText(query, {
    model: GEMINI_PRO_MODEL,
    systemInstruction: `Você é o Arquiteto de Software Sênior do projeto VitrineX AI. 
    Use o contexto do projeto fornecido para responder perguntas técnicas com precisão.
    Seja técnico, direto e cite arquivos específicos quando relevante.
    Contexto do Projeto: ${projectContext}`
  });

  return response;
};

// --- SEARCH TRENDS (Grounding) ---
export const searchTrends = async (
  query: string,
  location?: { latitude: number; longitude: number },
  language: string = 'en-US',
): Promise<Trend[]> => {
  const ai = await getGenAIClient();
  
  const tools: Tool[] = [{ googleSearch: {} }];
  const toolConfig: any = {};

  if (location) {
    tools.push({ googleMaps: {} });
    toolConfig.retrievalConfig = { latLng: location };
  }

  const prompt = language === 'pt-BR'
    ? `Encontre as tendências de marketing atuais para "${query}". Forneça um resumo detalhado em português.`
    : `Find current marketing trends for "${query}". Provide a detailed summary.`;

  try {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
        config: {
        tools,
        toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
        },
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    const trends: Trend[] = [
        {
        id: `trend-${Date.now()}`,
        query: query,
        score: Math.floor(Math.random() * 100) + 1,
        data: text || 'Nenhum dado encontrado.',
        sources: groundingChunks
            .filter((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
            .map((chunk: any) => ({
            uri: chunk.web?.uri || chunk.maps?.uri!,
            title: chunk.web?.title || chunk.maps?.title || 'Fonte Externa',
            })),
        groundingMetadata: groundingMetadata as any,
        createdAt: new Date().toISOString(),
        userId: 'mock-user-123',
        },
    ];
    return trends;
  } catch (e: any) {
      console.error("Search Trends Error:", e);
      throw new Error("Erro ao buscar tendências. Verifique se sua chave suporta Google Search Grounding.");
  }
};

// --- GOOGLE MAPS GROUNDING ---
export const findPlacesWithMaps = async (
  prompt: string,
  gpsLocation: { latitude: number; longitude: number } | null,
  textLocation: string,
): Promise<PlaceResult> => {
  const ai = await getGenAIClient();
  
  let fullPrompt = prompt;
  const config: any = {
    tools: [{ googleMaps: {} }],
  };

  if (textLocation) {
    fullPrompt = `${prompt} perto de ${textLocation}`;
  } else if (gpsLocation) {
    config.toolConfig = {
      retrievalConfig: { latLng: gpsLocation },
    };
  }
  
  try {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: fullPrompt,
        config,
    });

    const text = response.text || 'Nenhuma resposta gerada.';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const places = groundingChunks
        .filter((chunk: any) => chunk.maps?.uri && chunk.maps?.title)
        .map((chunk: any) => ({
        uri: chunk.maps.uri,
        title: chunk.maps.title,
        }));

    return { text, places };
  } catch (e: any) {
      console.error("Maps Grounding Error:", e);
      throw new Error("Erro ao buscar locais. Verifique se sua chave suporta Google Maps Grounding.");
  }
};

// --- CODE EXECUTION ---
export const executeCode = async (prompt: string): Promise<GeminiPart[]> => {
  const ai = await getGenAIClient();

  try {
    const response = await ai.models.generateContent({
        model: GEMINI_PRO_MODEL,
        contents: prompt,
        config: {
        tools: [{ codeExecution: {} }],
        },
    });

    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts) {
        throw new Error('A resposta da IA estava vazia ou foi bloqueada.');
    }

    return parts.map(p => ({
        text: p.text,
        executableCode: p.executableCode ? {
            language: 'PYTHON',
            code: p.executableCode.code
        } : undefined,
        codeExecutionResult: p.codeExecutionResult ? {
            outcome: p.codeExecutionResult.outcome as string,
            output: p.codeExecutionResult.output
        } : undefined
    })) as GeminiPart[];
  } catch (e: any) {
      console.error("Code Execution Error:", e);
      throw new Error(`Erro ao executar código: ${e.message}`);
  }
};

// --- CAMPAIGN BUILDER (Composite) ---
export const campaignBuilder = async (
  campaignPrompt: string,
): Promise<{ campaign: Campaign; videoUrl?: string }> => {
  const planPrompt = `Create a detailed marketing campaign plan for: "${campaignPrompt}".
          The plan should include 10 social media post ideas (with text content), 5 ad ideas (with headline and copy),
          and a chronological timeline. Return as JSON.`;
          
  const planJsonStr = await generateText(planPrompt, {
    model: GEMINI_PRO_MODEL,
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
  });

  const plan = JSON.parse(planJsonStr);

  let videoUrl: string | undefined = undefined;
  try {
    const videoPrompt = `A short promotional video for the campaign "${plan.campaignName}", style: ${campaignPrompt.substring(0, 50)}`;
    videoUrl = await generateVideo(videoPrompt, {
      model: VEO_FAST_GENERATE_MODEL,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
  } catch (e) {
    console.warn("Falha ao gerar vídeo da campanha (opcional):", e);
  }

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

// --- AI MANAGER STRATEGY ---
export const aiManagerStrategy = async (
  prompt: string,
  userProfile: UserProfile['businessProfile'],
): Promise<{ strategyText: string; suggestions: string[] }> => {
  const systemInstruction = `You are a marketing expert for a business in the ${userProfile.industry} industry, targeting ${userProfile.targetAudience}. Your goal is to provide a comprehensive marketing diagnosis and suggestions. Adopt a ${userProfile.visualStyle} tone.`;

  // USE GEMINI 2.5 FLASH TO ENABLE THINKING AND GROUNDING
  const jsonStr = await generateText(
    `Diagnose the marketing for my business: ${prompt}. Also, provide actionable suggestions for campaigns and sales funnels.`, 
    {
      model: GEMINI_FLASH_MODEL, // Switched from PRO to FLASH 2.5 to enable Thinking
      systemInstruction,
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
      thinkingBudget: 2048, // Increased thinking budget
      tools: [{ googleSearch: {} }] // Added Google Search for real-time strategy
    }
  );

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
      return { strategyText: jsonStr, suggestions: [] };
    }
  }
  return { strategyText: 'Não foi possível gerar a estratégia.', suggestions: [] };
};

// --- SPEECH (TTS) ---
export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  model: string = GEMINI_TTS_MODEL,
): Promise<string | undefined> => {
  const ai = await getGenAIClient();
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const audioPart = response.candidates?.[0]?.content?.parts?.[0];
  if (audioPart && audioPart.inlineData) {
    return audioPart.inlineData.data;
  }
  return undefined;
};

// --- CHAT & LIVE (Helpers mantidos) ---

export const startChatAsync = async (
  model: string = GEMINI_FLASH_MODEL,
  provider: ProviderName = 'Google Gemini',
  systemInstruction?: string,
  history?: ChatMessage[],
  useKnowledgeBase?: boolean,
  kbStoreName?: string
): Promise<Chat> => {
  const ai = await getGenAIClient();
  
  let finalSystemInstruction = systemInstruction || "";

  // FALLBACK: Se o backend não estiver disponível, injetar conteúdo do localStorage no prompt
  if (useKnowledgeBase) {
      const localContent = localStorage.getItem(LOCAL_KB_STORAGE_KEY);
      if (localContent) {
          finalSystemInstruction += `\n\n[CONTEXTO DA BASE DE CONHECIMENTO LOCAL]\nUse as informações abaixo para responder às perguntas do usuário:\n${localContent.substring(0, 30000)}... (truncado se muito longo)`;
          console.log("RAG: Contexto local injetado no system instruction.");
      }
  }

  // Configuração
  const config: any = {
    systemInstruction: finalSystemInstruction,
  };

  // Se houver uma store real e backend ativo, usar File Search Tool oficial
  if (useKnowledgeBase && kbStoreName && !kbStoreName.includes('mock')) {
    config.tools = [{
        fileSearch: {
            fileSearchStoreNames: [kbStoreName]
        }
    }];
  }

  const sdkHistory: Content[] = (history || [])
    .filter(msg => msg.role !== 'tool')
    .map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

  return ai.chats.create({
    model,
    config,
    history: sdkHistory,
  });
};

export const sendMessageToChat = async (
  chat: Chat,
  message: string | (string | Part)[],
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  if (signal?.aborted) return "";

  try {
    // UPDATED: Support for multimodal message content
    const responseIterable = await chat.sendMessageStream(
      // FIXED: chat.sendMessageStream expects an object with a 'message' property
      { message }
    );
    let fullText = '';

    for await (const chunk of responseIterable) {
      if (signal?.aborted) break;
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        if (onChunk) onChunk(fullText);
      }
    }

    return fullText;
  } catch (error) {
    if (signal?.aborted) return "";
    throw error;
  }
};

export interface LiveSessionCallbacks {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => Promise<void> | void;
  onerror: (error: ErrorEvent) => void;
  onclose: (event: CloseEvent) => void;
  onTranscriptionUpdate: (input: string, output: string) => void;
  onTurnComplete: (input: string, output: string) => void;
}

export const connectLiveSession = async (
  callbacks: LiveSessionCallbacks,
  systemInstruction?: string,
  tools?: { functionDeclarations?: FunctionDeclaration[] }[]
) => {
  const ai = await getGenAIClient();

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

// --- FILE SEARCH STORE HELPERS ---
async function fetchKnowledgeBase<T>(endpoint: string, method: string, body: any): Promise<T> {
    const organizationId = getActiveOrganizationId();
    const idToken = await getFirebaseIdToken();
    const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/knowledge-base/${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    return response.json();
}

const getActiveOrganizationId = (): string => {
  const activeOrg: OrganizationMembership | undefined = getActiveOrganization();
  return activeOrg ? activeOrg.organization.id : 'mock-org-id';
};

export const createFileSearchStore = async (displayName?: string): Promise<any> => {
  try {
      return await fetchKnowledgeBase('store', 'POST', { displayName });
  } catch (e) {
      console.warn("Backend RAG creation failed, returning mock store.");
      return { storeName: `fileSearchStores/mock-${Date.now()}`, displayName: displayName || 'Mock Store' };
  }
};

export const uploadFileToSearchStore = async (file: File, metadata: any): Promise<any> => {
    // 1. Tentar Backend Real
    const organizationId = getActiveOrganizationId();
    const idToken = await getFirebaseIdToken();
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/knowledge-base/upload-file`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` },
            body: formData,
        });
        if (!response.ok) throw new Error("Backend upload failed");
        return response.json();
    } catch (e) {
        console.warn("Backend RAG upload failed. Switching to Local Client RAG.");
        
        // 2. Fallback: Salvar conteúdo de texto no LocalStorage para Context Stuffing
        if (file.type.includes('text') || file.type.includes('json') || file.type.includes('csv') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
            try {
                const text = await file.text();
                const existing = localStorage.getItem(LOCAL_KB_STORAGE_KEY) || '';
                // Append simple text content
                const newContent = `${existing}\n\n--- FILE: ${file.name} ---\n${text}`;
                localStorage.setItem(LOCAL_KB_STORAGE_KEY, newContent);
                console.log(`File ${file.name} added to Local Knowledge Base.`);
                return { fileId: `local-${Date.now()}` };
            } catch (readError) {
                console.error("Failed to read file locally", readError);
            }
        }
        
        return { fileId: 'mock-file-id' };
    }
};

export const queryFileSearchStore = async (prompt: string): Promise<KnowledgeBaseQueryResponse> => {
    try {
        return await fetchKnowledgeBase('query', 'POST', { prompt });
    } catch (e) {
        // Fallback: Busca simples no conteúdo local
        const localContent = localStorage.getItem(LOCAL_KB_STORAGE_KEY);
        if (localContent) {
            // Se tiver conteúdo local, simulamos uma resposta encontrando palavras-chave ou retornando sucesso para o chat processar
            if (localContent.toLowerCase().includes(prompt.toLowerCase().split(' ')[0])) {
                 return {
                    resposta: "Encontrei referências nos seus arquivos locais. (O conteúdo será injetado no chat para resposta completa).",
                    arquivos_usados: ["Local Files"],
                    trechos_referenciados: [],
                    confianca: 0.8
                 };
            }
        }

        return {
            resposta: "Modo offline: RAG requer backend ativo ou arquivos de texto carregados localmente.",
            arquivos_usados: [],
            trechos_referenciados: [],
            confianca: 0
        };
    }
};

// --- AUDIO HELPERS ---
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
