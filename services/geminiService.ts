
import {
  GoogleGenAI,
  GenerateContentResponse,
  GenerateContentParameters,
  VideoGenerationReferenceImage,
  Type,
  FunctionDeclaration,
  Chat,
  LiveServerMessage,
  Modality,
  Blob
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
  ProviderName
} from '../types';
import { executeWithProviderFallback, getBestApiKey } from './keyManagerService';

// Helper to get Gemini client with a specific key
const createGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: GenerateContentParameters['config']['responseSchema'];
  tools?: GenerateContentParameters['config']['tools'];
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

  // For non-Gemini providers, we simulate the response since we can't import their SDKs
  if (provider !== 'Google Gemini') {
    return executeWithProviderFallback(provider, async (key) => {
        // console.log(`Simulating ${provider} generation with key ending in ...${key.slice(-4)}`);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        return `[Simulated Response from ${provider}]: ${prompt.substring(0, 50)}... This is a mock response because the SDK for ${provider} is not loaded in this environment.`;
    });
  }

  // Gemini Logic with Fallback
  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
    const ai = createGeminiClient(apiKey);
    const config: GenerateContentParameters['config'] = {
      responseMimeType,
      responseSchema,
      systemInstruction,
      tools,
      thinkingConfig: thinkingBudget !== undefined ? { thinkingBudget } : undefined,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: config,
    });

    if (response.candidates && response.candidates.length > 0) {
      return response.text || '';
    } else {
      console.warn('No candidates found in Gemini text generation response.');
      return 'No text generated.';
    }
  });
};

export interface GenerateImageOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  tools?: GenerateContentParameters['config']['tools'];
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

  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
    const ai = createGeminiClient(apiKey);
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any,
        },
        tools,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return { imageUrl: `data:image/png;base64,${base64EncodeString}` };
      } else if (part.text) {
        return { text: part.text };
      }
    }
    return { text: 'No image generated.' };
  });
};

export const editImage = async (
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  model: string = GEMINI_IMAGE_FLASH_MODEL,
): Promise<{ imageUrl?: string; text?: string }> => {
  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
    const ai = createGeminiClient(apiKey);
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return { imageUrl: `data:image/png;base64,${base64EncodeString}` };
      } else if (part.text) {
        return { text: part.text };
      }
    }
    return { text: 'No image edited.' };
  });
};

export interface GenerateVideoOptions {
  model?: string;
  image?: { imageBytes: string; mimeType: string };
  lastFrame?: { imageBytes: string; mimeType: string };
  referenceImages?: VideoGenerationReferenceImage[];
  config?: any;
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

  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
    const ai = createGeminiClient(apiKey);
    
    const videoConfig: any = { ...config };
    if (lastFrame) videoConfig.lastFrame = lastFrame;
    if (referenceImages) videoConfig.referenceImages = referenceImages;

    let operation = await ai.models.generateVideos({
      model: model,
      prompt: prompt,
      image: image,
      config: videoConfig,
    });

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      return `${downloadLink}&key=${apiKey}`;
    } else {
      console.warn('No video URI found in Gemini video generation response.');
      return '';
    }
  });
};

export const aiManagerStrategy = async (
  prompt: string,
  userProfile: UserProfile['businessProfile'],
): Promise<{ strategyText: string; suggestions: string[] }> => {
  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
      const ai = createGeminiClient(apiKey);
      const systemInstruction = `You are a marketing expert for a business in the ${userProfile.industry} industry, targeting ${userProfile.targetAudience}. Your goal is to provide a comprehensive marketing diagnosis, identify failures, and suggest campaign ideas and sales funnels. Adopt a ${userProfile.visualStyle} tone.`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_PRO_MODEL,
        contents: `Diagnose the marketing for my business: ${prompt}. Also, provide actionable suggestions for campaigns and sales funnels.`,
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
          thinkingConfig: { thinkingBudget: 32768 },
        },
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        const result = JSON.parse(jsonStr);
        return {
          strategyText: result.strategyText,
          suggestions: [
            ...(result.campaignSuggestions || []),
            ...(result.salesFunnelSuggestions || []),
          ],
        };
      }
      return { strategyText: 'No strategy generated.', suggestions: [] };
  });
};

export const searchTrends = async (
  query: string,
  location?: { latitude: number; longitude: number },
): Promise<Trend[]> => {
    return executeWithProviderFallback('Google Gemini', async (apiKey) => {
        const ai = createGeminiClient(apiKey);
        const contents = `Find current marketing trends for "${query}". Provide a summary and real sources.`;
        const tools = [{ googleSearch: {} }];
        if (location) {
          tools.push({ googleMaps: {} } as any);
        }
        const config: GenerateContentParameters['config'] = {
          tools: tools,
          toolConfig: location ? { retrievalConfig: { latLng: location } } : undefined,
        };
    
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: GEMINI_FLASH_MODEL,
          contents: contents,
          config: config,
        });
    
        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
        const trends: Trend[] = [
          {
            id: `trend-${Date.now()}`,
            query: query,
            score: Math.floor(Math.random() * 100) + 1,
            data: text || 'No trend data found.',
            sources: groundingChunks
              .filter((chunk) => chunk.web?.uri || chunk.maps?.uri)
              .map((chunk) => ({
                uri: chunk.web?.uri || chunk.maps?.uri!,
                title: chunk.web?.title || chunk.maps?.title || 'External Source',
              })),
            createdAt: new Date().toISOString(),
            userId: 'mock-user-123',
          },
        ];
        return trends;
    });
};

export const campaignBuilder = async (
  campaignPrompt: string,
): Promise<{ campaign: Campaign; videoUrl?: string }> => {
    // Note: Complex flows like this should probably just default to Gemini for simplicity in this demo,
    // as passing keys around for nested calls is complex. We use 'Google Gemini' explicitly here.
    return executeWithProviderFallback('Google Gemini', async (apiKey) => {
        const ai = createGeminiClient(apiKey);
        // Step 1: Generate campaign plan
        const textPlan = await generateText(
          `Create a detailed marketing campaign plan for: "${campaignPrompt}".
          The plan should include 10 social media post ideas (with text content), 5 ad ideas (with headline and copy),
          and a chronological timeline. Return as JSON.`,
          {
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
            thinkingBudget: 32768,
            provider: 'Google Gemini'
          },
        );
    
        const plan = JSON.parse(textPlan);
    
        // Step 2: Generate Video (Using generateVideo which internally handles its own fallback)
        const videoPrompt = `A short promotional video for the campaign "${plan.campaignName}", focusing on a dynamic visual style based on this description: "${campaignPrompt}".`;
        const videoUrl = await generateVideo(videoPrompt, { model: VEO_GENERATE_MODEL, config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        } });
    
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
    });
};

// --- Chatbot Functions ---
export const startChat = (model: string = GEMINI_PRO_MODEL, provider: ProviderName = 'Google Gemini') => {
  // Chat object creation needs a client. We can't really create a "Chat" object that auto-rotates keys easily
  // because the Chat object holds state.
  // For the purpose of this demo, we will get the BEST key at the start of the chat.
  // If that key fails mid-chat, the chat might error. A full robust system would rebuild the chat history with a new key.
  
  if (provider !== 'Google Gemini') {
      // Return a mock chat object
      return {
          sendMessageStream: async ({ message }: { message: string }) => {
               // Async generator for stream
               return (async function* () {
                   yield { text: `[${provider}]: ${message} (Simulated)` } as GenerateContentResponse;
               })();
          }
      } as unknown as Chat;
  }

  // Get current best key synchronously-ish (async wrapper needed in component or we await here)
  // Since this function is synchronous in the original signature, we must modify consumer or cheat.
  // We'll throw if no key is found immediately for simplicity, or consumers should ensure keys exist.
  // Ideally, startChat should be async.
  throw new Error("startChat should be called asynchronously via startChatAsync or similar in this new architecture.");
};

export const startChatAsync = async (model: string = GEMINI_PRO_MODEL, provider: ProviderName = 'Google Gemini'): Promise<Chat> => {
    if (provider !== 'Google Gemini') {
         return {
          sendMessageStream: async ({ message }: { message: string }) => {
               return (async function* () {
                   await new Promise(r => setTimeout(r, 500));
                   yield { text: `[${provider} Response]: I am a simulated ${provider} agent. ` } as GenerateContentResponse;
                   await new Promise(r => setTimeout(r, 500));
                   yield { text: `My integration is being mocked because the SDK is not loaded.` } as GenerateContentResponse;
               })();
          }
      } as unknown as Chat;
    }

    const apiKey = await getBestApiKey(provider);
    const ai = createGeminiClient(apiKey);
    return ai.chats.create({ model: model });
};

export const sendMessageToChat = async (
  chat: Chat, 
  message: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  try {
    const response = await chat.sendMessageStream({ message: message });
    let fullText = '';
    
    for await (const chunk of response) {
      if (signal?.aborted) {
        // Stop processing chunks if aborted
        break; 
      }
      
      const chunkText = chunk.text;
      fullText += chunkText;
      
      // Notify caller of progress
      if (onChunk) {
        onChunk(fullText);
      }
    }
    
    return fullText;
  } catch (error) {
    if (signal?.aborted) {
       return ""; // Suppress error if purposefully aborted
    }
    console.error('Error sending message to chat:', error);
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- Analysis Functions ---
export const analyzeImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
    const ai = createGeminiClient(apiKey);
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: { thinkingConfig: { thinkingBudget: 32768 } },
    });
    return response.text || 'No analysis generated.';
  });
};

export const analyzeVideo = async (
  videoUrl: string,
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
    return executeWithProviderFallback('Google Gemini', async (apiKey) => {
        const ai = createGeminiClient(apiKey);
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: model,
          contents: {
            parts: [
              { fileData: { fileUri: videoUrl, mimeType: 'video/mp4' } },
              { text: prompt },
            ],
          },
          config: { thinkingConfig: { thinkingBudget: 32768 } },
        });
        return response.text || 'No analysis generated.';
    });
};

// --- TTS Functions ---
export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  model: string = GEMINI_TTS_MODEL,
): Promise<string | undefined> => {
  return executeWithProviderFallback('Google Gemini', async (apiKey) => {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  });
};

// --- Live API Functions ---

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
  // Get best key ONCE at start
  const apiKey = await getBestApiKey('Google Gemini');
  const ai = createGeminiClient(apiKey);

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
        console.error('Live session error:', e);
        callbacks.onerror(e);
      },
      onclose: (e: CloseEvent) => {
        console.debug('Live session closed:', e);
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
