import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely with the injected environment key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Full-stack API endpoint for Gemini content generation
app.post("/api/generate-content", async (req, res) => {
  try {
    const { tone, audience, platform, prompt, keywords } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Topic/prompt description is required" });
    }

    const systemInstruction = `You are an expert social media strategist and highly skilled copywriter. 
Your goal is to write captivating, high-converting copy and posts optimized specifically for ${platform}.
Adjust the voice tone to match "${tone}" and tailor your writing specifically for this target audience: "${audience}".

Deliver the following JSON structure:
1. "captions": Exactly 3 alternative captions or text posts. Format them with native styling, spacing, hashtags, and emojis fitting the platform (e.g., short & punchy for TikTok/Instagram, insightful & structured for LinkedIn).
2. "ideas": Exactly 3 creative content formats, visual concepts, video hooks, or trends to accompany the generated captions.`;

    const userPrompt = `Develop high-engagement marketing copy and content ideas based on this context:
Product/Topic Description: ${prompt}
Keywords to weave in: ${keywords || "none specified"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.85,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            captions: {
              type: Type.ARRAY,
              description: "3 highly optimized, platform-native captions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  headline: { type: Type.STRING, description: "A catchy hook, headline, or opening sentence" },
                  body: { type: Type.STRING, description: "Main post body copy with well-placed line breaks, emojis, and hashtags" },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 high-relevance hashtags" },
                  callToAction: { type: Type.STRING, description: "Direct, engaging call-to-action" }
                },
                required: ["id", "headline", "body", "hashtags", "callToAction"]
              }
            },
            ideas: {
              type: Type.ARRAY,
              description: "3 innovative visual or short-form video hooks/styles.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Engaging title for the content format" },
                  visualConcept: { type: Type.STRING, description: "Visual guidelines (props, shots, screen overlay description)" },
                  audioSuggestion: { type: Type.STRING, description: "Style of music, trending sound type, or voiceover narration" },
                  hookText: { type: Type.STRING, description: "High-retention text overlay for the first 3 seconds" }
                },
                required: ["id", "title", "visualConcept", "audioSuggestion", "hookText"]
              }
            }
          },
          required: ["captions", "ideas"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini API");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI marketing content" });
  }
});

// Full-stack API endpoint for Marketing Trends with Google Search grounding
app.post("/api/marketing-trends", async (req, res) => {
  try {
    const { industry } = req.body;

    if (!industry) {
      return res.status(400).json({ error: "Industry is required" });
    }

    const currentYear = new Date().getFullYear();
    const systemInstruction = `You are a world-class marketing intelligence strategist and social listening bot.
Your absolute superpower is analyzing the latest cultural shifts, viral challenges, trending audio styles, and rising hashtags on social media channels (TikTok, Instagram, LinkedIn, and Twitter/X) for the selected industry.

You MUST use the Google Search tool to perform active search queries about real-world active hashtags and content concepts for the specified industry as of ${currentYear}. Do NOT hallucinate. Look for real, currently buzzing social media topics, challenges, or tags in the past 30 days.

Deliver the results in a precise, well-structured JSON format that matches the requested schema.`;

    const userPrompt = `Fetch and synthesize the absolute latest trending social media hashtags, viral hooks, and content formats for the "${industry}" industry.
Perform deep search queries like "${industry} trending social media hashtags ${currentYear}", "${industry} viral TikTok trends ${currentYear}", and "${industry} marketing campaigns".

Analyze the results and populate:
1. "trendingHashtags": 5 real, high-buzz hashtags on platforms like TikTok, Instagram, or LinkedIn. For each, describe the current 2026 context and estimated volume level.
2. "viralConcepts": 3 creative, actionable content style templates/formats that are currently driving high engagement.
3. "searchQueriesUsed": 3 exact queries you ran or suggest running to obtain this real-time intelligence.
4. "summarySourceInsights": A concise 3-sentence summary paragraph explaining the overarching sentiment and key aesthetic topics of discussion in the "${industry}" community right now.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.5, // keep temperature lower for factual grounded summaries
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trendingHashtags: {
              type: Type.ARRAY,
              description: "5 high-relevance, active industry hashtags.",
              items: {
                type: Type.OBJECT,
                properties: {
                  tag: { type: Type.STRING, description: "Hashtag starting with #, e.g. #MatchaMinutes" },
                  volume: { type: Type.STRING, description: "e.g. 'Viral / Exponential', 'Rising Spike', 'High Steady'" },
                  context: { type: Type.STRING, description: "1-2 sentences on why this exact tag is active and what content belongs to it." },
                  platform: { type: Type.STRING, description: "Target social media platform, e.g. TikTok, LinkedIn, Instagram" }
                },
                required: ["tag", "volume", "context", "platform"]
              }
            },
            viralConcepts: {
              type: Type.ARRAY,
              description: "3 highly engaging, viral content style concepts currently trending.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Name of the viral hook/concept" },
                  description: { type: Type.STRING, description: "Step-by-step action plan on how a brand should construct this post/video." },
                  trigger: { type: Type.STRING, description: "What psychological trigger drives the audience interest?" },
                  difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" }
                },
                required: ["title", "description", "trigger", "difficulty"]
              }
            },
            searchQueriesUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exact queries executed to pull this trend intelligence."
            },
            summarySourceInsights: {
              type: Type.STRING,
              description: "A professional 3-sentence high-level summary of the live social atmosphere in this sector."
            }
          },
          required: ["trendingHashtags", "viralConcepts", "searchQueriesUsed", "summarySourceInsights"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini API");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Marketing Trends Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch real-time marketing trends" });
  }
});

async function startServer() {
  // Vite Middleware for development / Static file hosting for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
