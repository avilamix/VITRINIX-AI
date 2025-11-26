import {
  GoogleGenAI,
  GenerateContentResponse,
  GenerateContentParameters,
  VideoGenerationReferenceImage,
  VideoOperation,
  VideoGenerationConfig,
  ImageGenerationConfig,
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
  LibraryItem,
  ScheduleEntry,
} from '../types';

// Utility to create a new GoogleGenAI instance on demand
const getGeminiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set. Please select your Gemini API key.');
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: GenerateContentParameters['config']['responseSchema'];
  tools?: GenerateContentParameters['config']['tools'];
  thinkingBudget?: number; // Added for thinking mode
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
  } = options || {};

  try {
    const ai = getGeminiClient();
    const config: GenerateContentParameters['config'] = {
      responseMimeType,
      responseSchema,
      systemInstruction,
      tools,
      // Add thinkingConfig if thinkingBudget is provided
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
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export interface GenerateImageOptions {
  model?: string;
  aspectRatio?: ImageGenerationConfig['imageConfig']['aspectRatio'];
  imageSize?: ImageGenerationConfig['imageConfig']['imageSize'];
  tools?: GenerateContentParameters['config']['tools'];
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
  } = options || {};

  try {
    const ai = getGeminiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
        tools,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return { imageUrl: `data:image/png;base64,${base64EncodeString}` };
      } else if (part.text) {
        // If there's text along with the image
        return { text: part.text };
      }
    }
    console.warn('No image data found in Gemini image generation response.');
    return { text: 'No image generated.' };
  } catch (error) {
    console.error('Error generating image with Gemini:', error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const editImage = async (
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  model: string = GEMINI_IMAGE_FLASH_MODEL,
): Promise<{ imageUrl?: string; text?: string }> => {
  try {
    const ai = getGeminiClient();
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
    console.warn('No image data found in Gemini image editing response.');
    return { text: 'No image edited.' };
  } catch (error) {
    console.error('Error editing image with Gemini:', error);
    throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export interface GenerateVideoOptions {
  model?: string;
  image?: { imageBytes: string; mimeType: string };
  lastFrame?: { imageBytes: string; mimeType: string };
  referenceImages?: VideoGenerationReferenceImage[];
  config?: VideoGenerationConfig;
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

  try {
    const ai = getGeminiClient();
    let operation = await ai.models.generateVideos({
      model: model,
      prompt: prompt,
      image: image,
      lastFrame: lastFrame,
      referenceImages: referenceImages,
      config: config,
    });

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
      return `${downloadLink}&key=${process.env.API_KEY}`;
    } else {
      console.warn('No video URI found in Gemini video generation response.');
      return '';
    }
  } catch (error) {
    console.error('Error generating video with Gemini:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const aiManagerStrategy = async (
  prompt: string,
  userProfile: UserProfile['businessProfile'],
): Promise<{ strategyText: string; suggestions: string[] }> => {
  try {
    const ai = getGeminiClient();
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
            strategyText: {
              type: Type.STRING,
              description: 'A detailed marketing diagnosis and strategy.',
            },
            campaignSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'List of suggested campaign ideas.',
            },
            salesFunnelSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'List of suggested sales funnel strategies.',
            },
          },
          required: ['strategyText', 'campaignSuggestions', 'salesFunnelSuggestions'],
        },
        tools: [{ googleSearch: {} }], // Use Google Search for current context
        thinkingConfig: { thinkingBudget: 32768 }, // Enable thinking mode for complex strategy
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
  } catch (error) {
    console.error('Error in AI Manager strategy generation:', error);
    throw new Error(`Failed to generate strategy: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const searchTrends = async (
  query: string,
  location?: { latitude: number; longitude: number },
): Promise<Trend[]> => {
  try {
    const ai = getGeminiClient();
    const contents = `Find current marketing trends for "${query}". Provide a summary and real sources.`;
    const tools = [{ googleSearch: {} }];
    if (location) {
      // Add googleMaps tool if location is provided
      tools.push({ googleMaps: {} } as any); // Type assertion needed for now
    }
    const config: GenerateContentParameters['config'] = {
      tools: tools,
      toolConfig: location ? { retrievalConfig: { latLng: location } } : undefined,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL, // Flash for quicker trend search
      contents: contents,
      config: config,
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const trends: Trend[] = [
      {
        id: `trend-${Date.now()}`,
        query: query,
        score: Math.floor(Math.random() * 100) + 1, // Mock viral score
        data: text || 'No trend data found.',
        sources: groundingChunks
          .filter((chunk) => chunk.web?.uri || chunk.maps?.uri)
          .map((chunk) => ({
            uri: chunk.web?.uri || chunk.maps?.uri!,
            title: chunk.web?.title || chunk.maps?.title || 'External Source',
          })),
        createdAt: new Date().toISOString(),
        userId: 'mock-user-123', // Assign a mock userId
      },
    ];
    return trends;
  } catch (error) {
    console.error('Error searching trends with Gemini Grounding:', error);
    throw new Error(`Failed to search trends: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const campaignBuilder = async (
  campaignPrompt: string,
): Promise<{ campaign: Campaign; videoUrl?: string }> => {
  try {
    const ai = getGeminiClient();

    // Step 1: Generate campaign plan (posts, ads, timeline)
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
        thinkingBudget: 32768, // Enable thinking mode for complex campaign planning
      },
    );

    const plan = JSON.parse(textPlan);

    // Step 2: Generate a video for the campaign
    const videoPrompt = `A short promotional video for the campaign "${plan.campaignName}", focusing on a dynamic visual style based on this description: "${campaignPrompt}".`;
    const videoUrl = await generateVideo(videoPrompt, { model: VEO_GENERATE_MODEL, config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    } });

    // Step 3: Integrate generated assets into a Campaign object
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
  } catch (error) {
    console.error('Error in Campaign Builder:', error);
    throw new Error(`Failed to build campaign: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- New Chatbot Functions ---
export const startChat = (model: string = GEMINI_PRO_MODEL) => {
  const ai = getGeminiClient();
  return ai.chats.create({ model: model });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessageStream({ message: message });
    let fullText = '';
    for await (const chunk of response) {
      fullText += chunk.text;
    }
    return fullText;
  } catch (error) {
    console.error('Error sending message to chat:', error);
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- New Image/Video Analysis Functions ---
export const analyzeImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  try {
    const ai = getGeminiClient();
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
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Enable thinking mode for complex analysis
      },
    });
    return response.text || 'No analysis generated.';
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const analyzeVideo = async (
  videoUrl: string, // Assuming a publicly accessible video URL
  prompt: string,
  model: string = GEMINI_PRO_MODEL,
): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            fileData: {
              fileUri: videoUrl,
              mimeType: 'video/mp4', // Assuming MP4 for simplicity
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Enable thinking mode for complex analysis
      },
    });
    return response.text || 'No analysis generated.';
  } catch (error) {
    console.error('Error analyzing video with Gemini:', error);
    throw new Error(`Failed to analyze video: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- New Text-to-Speech Function ---
export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  model: string = GEMINI_TTS_MODEL,
): Promise<string | undefined> => {
  try {
    const ai = getGeminiClient();
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
  } catch (error) {
    console.error('Error generating speech with Gemini TTS:', error);
    throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- Live API (Conversational Voice App) Functions ---

// Internal helper functions for audio processing
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
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

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
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

export interface LiveSessionCallbacks {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => Promise<void>;
  onerror: (e: ErrorEvent) => void;
  onclose: (e: CloseEvent) => void;
  onTranscriptionUpdate: (input: string, output: string) => void;
  onTurnComplete: (input: string, output: string) => void;
}

export const connectLiveSession = async (
  callbacks: LiveSessionCallbacks,
  systemInstruction?: string,
  tools?: { functionDeclarations?: FunctionDeclaration[] }[]
) => {
  const ai = getGeminiClient();

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
        // Handle transcription updates
        if (message.serverContent?.outputTranscription) {
          currentOutputTranscription += message.serverContent.outputTranscription.text;
          callbacks.onTranscriptionUpdate(currentInputTranscription, currentOutputTranscription);
        } else if (message.serverContent?.inputTranscription) {
          currentInputTranscription += message.serverContent.inputTranscription.text;
          callbacks.onTranscriptionUpdate(currentInputTranscription, currentOutputTranscription);
        }

        // Handle turn completion
        if (message.serverContent?.turnComplete) {
          callbacks.onTurnComplete(currentInputTranscription, currentOutputTranscription);
          currentInputTranscription = '';
          currentOutputTranscription = '';
        }

        // Handle tool calls
        if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls) {
            console.debug('Function call:', fc);
            // Example: Assume a tool was called and returned "ok"
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

        await callbacks.onmessage(message); // Pass message to external handler for audio processing
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
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // Default voice
      },
      systemInstruction: systemInstruction,
      outputAudioTranscription: {}, // Enable transcription for model output audio
      inputAudioTranscription: {},  // Enable transcription for user input audio
      tools: tools,
    },
  });

  return sessionPromise;
};

export { decode, decodeAudioData, encode, createBlob }; // Export for LiveConversation to use internally