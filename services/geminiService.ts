
import {
  GoogleGenAI,
  GenerateContentResponse,
  VideoGenerationReferenceImage,
  Type,
  FunctionDeclaration,
  LiveServerMessage,
  Blob,
  Content,
  File as GenAIFile,
  Modality,
  Tool,
  Part,
  GenerateContentParameters
} from '@google/genai';
import {
  GEMINI_FLASH_MODEL,
  GEMINI_PRO_MODEL,
  GEMINI_IMAGE_FLASH_MODEL,
  GEMINI_IMAGE_PRO_MODEL,
  VEO_FAST_GENERATE_MODEL,
  GEMINI_LIVE_AUDIO_MODEL,
  GEMINI_TTS_MODEL,
  HARDCODED_API_KEY,
} from '../constants';
import {
  UserProfile,
  Post,
  Ad,
  Campaign,
  Trend,
  ChatMessage,
  KnowledgeBaseQueryResponse,
  OrganizationMembership,
} from '../types';
import { getFirebaseIdToken, getActiveOrganization } from './authService';

const BACKEND_URL = 'http://localhost:3000';
const LOCAL_KB_STORAGE_KEY = 'vitrinex_kb_local_content';

async function getApiKey(): Promise<string> {
  const localKey = localStorage.getItem('vitrinex_gemini_api_key');
  if (localKey) return localKey;
  if (process.env.API_KEY) return process.env.API_KEY;
  if (HARDCODED_API_KEY) return HARDCODED_API_KEY;
  throw new Error('Chave de API não encontrada.');
}

async function getGenAIClient(explicitKey?: string): Promise<GoogleGenAI> {
  const apiKey = explicitKey || await getApiKey();
  return new GoogleGenAI({ apiKey });
}

// Helper to get active organization ID or default
const getActiveOrganizationId = (): string => {
  const activeOrg: OrganizationMembership | undefined = getActiveOrganization();
  return activeOrg ? activeOrg.organization.id : 'mock-org-default';
};

async function proxyFetch<T>(endpoint: string, method: string, body: any): Promise<T> {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();
  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/ai-proxy/${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
    throw new Error(errorData.message || `Backend proxy request failed with status ${response.status}`);
  }
  return response.json();
}

export const testGeminiConnection = async (explicitKey?: string): Promise<string> => {
  const ai = await getGenAIClient(explicitKey);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  return response.text || 'No response text received';
};

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  tools?: Tool[];
  thinkingBudget?: number;
}

export const generateText = async (prompt: string, options?: GenerateTextOptions): Promise<string> => {
  try {
    const response = await proxyFetch<any>('call-gemini', 'POST', {
      model: options?.model || GEMINI_FLASH_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: options,
    });
    return response.response?.text || '';
  } catch (error) {
    console.warn("Backend proxy failed for generateText, falling back to client-side SDK.", error);
    const ai = await getGenAIClient();
    const response = await ai.models.generateContent({
      model: options?.model || GEMINI_FLASH_MODEL,
      contents: prompt,
      config: options,
    });
    return response.text || '';
  }
};

export interface GenerateImageOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  tools?: Tool[];
}

export const generateImage = async (prompt: string, options?: GenerateImageOptions): Promise<{ imageUrl?: string; text?: string }> => {
  const model = options?.model || GEMINI_IMAGE_FLASH_MODEL;
  
  // FIX: imageSize is ONLY supported by Gemini 3 Pro Image (gemini-3-pro-image-preview).
  // Sending it to Flash Image (gemini-2.5-flash-image) causes INVALID_ARGUMENT (400).
  const imageConfig: any = {
    aspectRatio: options?.aspectRatio,
  };
  
  if (model === GEMINI_IMAGE_PRO_MODEL && options?.imageSize) {
    imageConfig.imageSize = options.imageSize;
  }

  try {
    const response = await proxyFetch<any>('generate-image', 'POST', {
      prompt,
      model,
      imageConfig,
      options: {},
    });
    return { imageUrl: `data:${response.mimeType};base64,${response.base64Image}` };
  } catch (error) {
    console.warn("Backend proxy failed for generateImage, falling back to client-side SDK.", error);
    const ai = await getGenAIClient();
    
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig
      } as any
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
    
    if (imageUrl) return { imageUrl };
    return { text: response.text || 'Imagem gerada, mas formato não reconhecido no fallback.' };
  }
};

export const editImage = async (prompt: string, base64ImageData: string, mimeType: string, model: string = GEMINI_IMAGE_FLASH_MODEL): Promise<{ imageUrl?: string; text?: string }> => {
  try {
    const response = await proxyFetch<any>('call-gemini', 'POST', {
      model,
      contents: [{ role: 'user', parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] }],
    });
    const imagePart = response.response?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (imagePart) {
      return { imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
    }
    return { text: response.response?.text || 'Nenhuma edição retornada.' };
  } catch (error) {
    console.warn("Backend proxy failed for editImage, falling back to client-side SDK.", error);
    const ai = await getGenAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType } },
          { text: prompt },
        ],
      },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
      }
    }
    return { text: response.text || 'Nenhuma edição retornada no fallback.' };
  }
};

export interface GenerateVideoOptions {
  model?: string;
  image?: { imageBytes: string; mimeType: string };
  lastFrame?: { imageBytes: string; mimeType: string };
  referenceImages?: VideoGenerationReferenceImage[];
  config?: any;
}

export const generateVideo = async (prompt: string, options?: GenerateVideoOptions): Promise<string> => {
  try {
    const response = await proxyFetch<{ videoUri: string }>('generate-video', 'POST', {
      prompt,
      model: options?.model || VEO_FAST_GENERATE_MODEL,
      videoConfig: options?.config,
      ...options,
    });
    return response.videoUri;
  } catch (error) {
    console.warn("Backend proxy failed for generateVideo, falling back to client-side SDK.", error);
    const ai = await getGenAIClient();
    
    const request: any = {
        model: options?.model || VEO_FAST_GENERATE_MODEL,
        prompt,
        image: options?.image,
        lastFrame: options?.lastFrame,
        config: options?.config
    };
    
    Object.keys(request).forEach(key => request[key] === undefined && delete request[key]);

    let operation = await ai.models.generateVideos(request);
    
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    
    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) throw new Error("Video generated but no URI returned in fallback.");
    return uri;
  }
};

export const analyzeImage = async (base64ImageData: string, mimeType: string, prompt: string, model: string = GEMINI_PRO_MODEL): Promise<string> => {
  try {
    const response = await proxyFetch<any>('call-gemini', 'POST', {
      model,
      contents: [{ role: 'user', parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] }],
    });
    return response.response?.text || 'Sem análise.';
  } catch (error) {
    console.warn("Backend proxy failed for analyzeImage, falling back to client-side SDK.", error);
    const ai = await getGenAIClient();
    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType } },
                { text: prompt }
            ]
        }
    });
    return response.text || 'Sem análise no fallback.';
  }
};

export const queryArchitect = async (query: string): Promise<string> => {
  return generateText(query, { model: GEMINI_PRO_MODEL, systemInstruction: 'You are the Senior Software Architect...' });
};

export const searchTrends = async (query: string, language: string = 'en-US'): Promise<Trend[]> => {
  const prompt = language === 'pt-BR'
    ? `Encontre as tendências de marketing atuais para "${query}". Forneça um resumo detalhado em português.`
    : `Find current marketing trends for "${query}". Provide a detailed summary.`;
  
  try {
      const response = await proxyFetch<any>('call-gemini', 'POST', {
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.response?.text;
      const groundingMetadata = response.response?.candidates?.[0]?.groundingMetadata;
      return [{ id: `trend-${Date.now()}`, query, score: 85, data: text || '', sources: groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [], createdAt: new Date().toISOString(), userId: 'mock-user-123' }];
  } catch (error) {
      console.warn("Backend proxy failed for searchTrends, falling back to client-side SDK.", error);
      const ai = await getGenAIClient();
      const response = await ai.models.generateContent({
          model: GEMINI_FLASH_MODEL,
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] }
      });
      const text = response.text;
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      return [{ id: `trend-${Date.now()}`, query, score: 85, data: text || '', sources: groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [], createdAt: new Date().toISOString(), userId: 'mock-user-123' }];
  }
};

export const campaignBuilder = async (campaignPrompt: string): Promise<{ campaign: Campaign; videoUrl?: string }> => {
  const planPrompt = `Create a detailed marketing campaign plan...`;
  const planJsonStr = await generateText(planPrompt, {
    model: GEMINI_PRO_MODEL,
    responseMimeType: 'application/json',
    responseSchema: { type: Type.OBJECT, properties: { campaignName: { type: Type.STRING } } },
  });
  
  let plan;
  try {
      plan = JSON.parse(planJsonStr);
  } catch (e) {
      plan = { campaignName: "Campaign " + Date.now() };
  }

  let videoUrl: string | undefined = undefined;
  try {
    videoUrl = await generateVideo(`A short promo video for ${plan.campaignName}`);
  } catch (e) {
    console.warn("Video generation failed for campaign", e);
  }
  
  return { campaign: { id: `c-${Date.now()}`, name: plan.campaignName, type: 'general', posts: [], ads: [], timeline: '', createdAt: new Date().toISOString(), userId: 'mock-user-123' }, videoUrl };
};

export const aiManagerStrategy = async (prompt: string, userProfile: UserProfile['businessProfile']): Promise<{ strategyText: string; suggestions: string[] }> => {
  const systemInstruction = `You are a marketing expert...`;
  const response = await generateText(prompt, { model: GEMINI_FLASH_MODEL, systemInstruction, tools: [{ googleSearch: {} }], thinkingBudget: 2048 });
  return { strategyText: response, suggestions: ["Suggestion 1", "Suggestion 2"] };
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | undefined> => {
  try {
    const response = await proxyFetch<any>('generate-speech', 'POST', {
      text,
      model: GEMINI_TTS_MODEL,
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    });
    return response.base64Audio;
  } catch (error) {
    console.warn("Backend proxy failed for generateSpeech, falling back to client-side SDK.", error);
    const ai = await getGenAIClient();
    const response = await ai.models.generateContent({
        model: GEMINI_TTS_MODEL,
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
};

export const sendMessageToChat = async (
  history: ChatMessage[],
  message: string | (string | Part)[],
  onChunk: (text: string) => void,
  options: { model?: string; systemInstruction?: string; useKnowledgeBase?: boolean },
  signal?: AbortSignal
): Promise<string> => {
  try {
    const organizationId = getActiveOrganizationId();
    const idToken = await getFirebaseIdToken();

    const body = {
      prompt: typeof message === 'string' ? message : message.find(p => typeof p === 'string') || '',
      history: history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      model: options.model || GEMINI_PRO_MODEL,
      options: { systemInstruction: options.systemInstruction },
    };

    const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/ai-proxy/stream-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok || !response.body) throw new Error(`Streaming request failed: ${response.statusText}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) { reader.cancel(); break; }
      const chunkStr = decoder.decode(value);
      try {
        const chunkJson = JSON.parse(chunkStr);
        if (chunkJson.text) {
          fullText += chunkJson.text;
          onChunk(fullText);
        }
      } catch(e) { fullText += chunkStr; onChunk(fullText); }
    }
    return fullText;
  } catch (error) {
    if (!signal?.aborted) {
        console.warn("Backend proxy failed for sendMessageToChat, falling back to client-side SDK.", error);
        
        const ai = await getGenAIClient();
        const model = options.model || GEMINI_PRO_MODEL;
        const chatHistory = history.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

        const chat = ai.chats.create({ model, history: chatHistory, config: { systemInstruction: options.systemInstruction } });
        const msgContent = typeof message === 'string' ? message : { parts: message as Part[] };
        const resultStream = await chat.sendMessageStream(msgContent);
        
        let fullText = '';
        for await (const chunk of resultStream) {
            if (signal?.aborted) break;
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                onChunk(fullText);
            }
        }
        return fullText;
    }
    throw error;
  }
};

export interface LiveSessionCallbacks {}
export const connectLiveSession = async (callbacks: LiveSessionCallbacks) => {};

export const createFileSearchStore = async (displayName?: string): Promise<any> => {
  try { return await proxyFetch('knowledge-base/store', 'POST', { displayName }); }
  catch (e) { console.warn("Fallback: CreateStore", e); return { storeName: 'mock-store', displayName: displayName || 'Mock' }; }
};

export const uploadFileToSearchStore = async (file: File, metadata: any): Promise<any> => {
    try {
        const orgId = getActiveOrganizationId();
        const token = await getFirebaseIdToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BACKEND_URL}/organizations/${orgId}/knowledge-base/upload-file`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData,
        });
        if (!res.ok) throw new Error("Backend upload failed");
        return res.json();
    } catch (e) { console.warn("Fallback: uploadFile", e); return { fileId: 'mock-file-id' }; }
};

export const queryFileSearchStore = async (prompt: string): Promise<KnowledgeBaseQueryResponse> => {
    try { return await proxyFetch('knowledge-base/query', 'POST', { prompt }); }
    catch (e) {
        console.warn("Fallback: queryFileSearchStore", e);
        const text = await generateText(prompt);
        return { resposta: text, arquivos_usados: [], trechos_referenciados: [], confianca: 0 };
    }
};

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
    data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))),
    mimeType: 'audio/pcm;rate=16000',
  };
}
