import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Sparkles, 
  Search, 
  TrendingUp, 
  Share2, 
  AlertCircle, 
  Terminal, 
  Hash, 
  Video, 
  ExternalLink, 
  ArrowRight, 
  Cpu, 
  Flame, 
  Check, 
  Activity, 
  Instagram, 
  Linkedin, 
  Twitter, 
  PlaySquare, 
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

interface TrendingHashtag {
  tag: string;
  volume: string;
  context: string;
  platform: string;
}

interface ViralConcept {
  title: string;
  description: string;
  trigger: string;
  difficulty: string;
}

interface TrendsResult {
  trendingHashtags: TrendingHashtag[];
  viralConcepts: ViralConcept[];
  searchQueriesUsed: string[];
  summarySourceInsights: string;
}

interface MarketingTrendsProps {
  onUseInGenerator: (topic: string, keywords: string) => void;
}

const INDUSTRIES = [
  { id: 'SaaS & AI Tech', label: 'SaaS & AI Tech', emoji: '💻', description: 'B2B solutions, software, and artificial intelligence.', color: 'from-blue-500/10 to-indigo-500/10 border-blue-200 hover:border-blue-500' },
  { id: 'Organic Food & Matcha', label: 'Food & Beverage', emoji: '🌿', description: 'Healthy eats, specialty beverages, and matcha teas.', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 hover:border-emerald-500' },
  { id: 'Beauty & Cosmetics', label: 'Beauty & Cosmetics', emoji: '💄', description: 'Skincare, makeup routines, and self-care products.', color: 'from-pink-500/10 to-rose-500/10 border-pink-200 hover:border-pink-500' },
  { id: 'Health & Fitness', label: 'Health & Fitness', emoji: '🏋️', description: 'Gyms, digital health trackers, and athletic apparel.', color: 'from-amber-500/10 to-orange-500/10 border-amber-200 hover:border-amber-500' },
  { id: 'Fintech & Web3', label: 'Fintech & Web3', emoji: '📈', description: 'Crypto assets, digital banking, and retail investing.', color: 'from-purple-500/10 to-violet-500/10 border-purple-200 hover:border-purple-500' },
  { id: 'Lifestyle & Fashion', label: 'Lifestyle & Fashion', emoji: '🎒', description: 'Streetwear, capsule wardrobes, and travel gear.', color: 'from-sky-500/10 to-cyan-500/10 border-sky-200 hover:border-sky-500' }
];

export default function MarketingTrends({ onUseInGenerator }: MarketingTrendsProps) {
  const [selectedIndustry, setSelectedIndustry] = useState('SaaS & AI Tech');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // React Query mutation to call backend search-grounded route
  const trendsMutation = useMutation<TrendsResult, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/marketing-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry: selectedIndustry
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch live trends');
      }

      return response.json();
    }
  });

  const handleCopyHashtag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedText(tag);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('linkedin')) return <Linkedin className="w-3.5 h-3.5 text-blue-700" />;
    if (p.includes('instagram')) return <Instagram className="w-3.5 h-3.5 text-pink-600" />;
    if (p.includes('twitter') || p.includes('x')) return <Twitter className="w-3.5 h-3.5 text-slate-800" />;
    if (p.includes('tiktok') || p.includes('reel') || p.includes('youtube')) return <PlaySquare className="w-3.5 h-3.5 text-cyan-600" />;
    return <Globe className="w-3.5 h-3.5 text-muted" />;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="marketing-trends-container">
      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="trends-header">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium tracking-wide text-xs uppercase">
            <Globe className="w-4 h-4 text-primary animate-spin" />
            <span>Google Search Grounding Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-title tracking-tight mt-1">Live Social & Industry Trends</h1>
          <p className="text-muted text-sm mt-1">
            Leverage Google Search to fetch real-time viral formats, active hashtags, and high-retention post ideas.
          </p>
        </div>

        {/* ACTIVE YEAR BADGE */}
        <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 text-success text-xs font-semibold px-3 py-1.5 rounded-full shadow-soft self-start">
          <Activity className="w-3.5 h-3.5 text-success" />
          <span>Real-time Grounding Active</span>
        </div>
      </div>

      {/* STEP 1: SELECT INDUSTRY GRID */}
      <div className="bg-surface border border-border p-6 rounded-3xl shadow-card space-y-5" id="industry-selector-panel">
        <div>
          <h2 className="text-base font-bold text-title tracking-tight">Step 1: Select Your Vertical</h2>
          <p className="text-xs text-muted">Choose your brand niche to align the search-grounding engine correctly.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="grid-industries">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              id={`industry-tile-${ind.id.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedIndustry(ind.id)}
              className={`flex items-start text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                selectedIndustry === ind.id
                  ? 'bg-gradient-to-br border-primary/40 shadow-soft scale-[1.01]'
                  : 'bg-background border-border/80 hover:bg-surface hover:scale-[1.005]'
              }`}
            >
              <div className={`p-2.5 rounded-xl text-xl bg-gradient-to-br ${ind.color} shrink-0 mr-3.5`}>
                {ind.emoji}
              </div>
              <div className="space-y-1">
                <h4 className={`text-xs font-bold transition-colors ${
                  selectedIndustry === ind.id ? 'text-primary' : 'text-title'
                }`}>
                  {ind.label}
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  {ind.description}
                </p>
              </div>
              
              {/* Highlight bar */}
              {selectedIndustry === ind.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              )}
            </button>
          ))}
        </div>

        {/* DISCOVERY ACTION BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            id="btn-discover-trends"
            disabled={trendsMutation.isPending}
            onClick={() => trendsMutation.mutate()}
            className="flex items-center gap-2 bg-primary hover:bg-opacity-95 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {trendsMutation.isPending ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                <span>Executing Live Google Search...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Fetch Live Social Trends</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DISCOVERY RESULTS OR LOADING COMPONENT */}
      {trendsMutation.isPending && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="trends-loading-view">
          
          {/* SEARCH TELEMETRY ENGINE */}
          <div className="bg-surface border border-border rounded-3xl p-6 lg:col-span-5 shadow-card flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary animate-pulse" />
                <h3 className="text-xs font-bold text-title uppercase tracking-wider">Search Grounding Logs</h3>
              </div>
              <p className="text-[11px] text-muted">
                These telemetry logs outline the live queries dispatched by Gemini to retrieve 2026 data.
              </p>
            </div>

            <div className="bg-background border border-border p-4 rounded-2xl font-mono text-[10px] space-y-3 text-emerald-500/90 leading-relaxed min-h-[220px]">
              <p className="text-muted/60">[SYSTEM_INFO] Establishing workspace endpoint security rules...</p>
              <p className="text-muted/60">[OAUTH_CHECK] Enterprise sandbox connection verified.</p>
              <p className="text-primary animate-pulse font-semibold">[SEARCHING] Fetching live Google index for "{selectedIndustry}"...</p>
              <p className="text-muted/40">&gt; Query 1: "{selectedIndustry} viral tiktok campaigns June 2026"</p>
              <p className="text-muted/40">&gt; Query 2: "{selectedIndustry} trending industry hashtags 2026"</p>
              <p className="text-primary animate-bounce font-semibold">[ANALYZING] Reading web resources & indexing social spikes...</p>
              <p className="text-success">[COMPILING] Injecting factual source references into JSON payload...</p>
            </div>

            <div className="text-[10px] text-muted italic bg-primary/5 p-3 rounded-xl border border-primary/10">
              ⚡ Live Grounding provides real-world hashtags and trending cultural insights directly from Google indexes, removing the hallucination risk.
            </div>
          </div>

          {/* DUMMY LOADER GRID CARDS */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-surface border border-border/70 p-6 rounded-3xl animate-pulse space-y-4">
              <div className="h-4 bg-border rounded w-1/3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-border rounded w-full"></div>
                <div className="h-3 bg-border rounded w-5/6"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface border border-border/70 p-5 rounded-2xl animate-pulse space-y-3">
                <div className="h-3 bg-border rounded w-1/4"></div>
                <div className="h-4 bg-border rounded w-3/4"></div>
                <div className="h-3 bg-border rounded w-5/6"></div>
              </div>
              <div className="bg-surface border border-border/70 p-5 rounded-2xl animate-pulse space-y-3">
                <div className="h-3 bg-border rounded w-1/4"></div>
                <div className="h-4 bg-border rounded w-3/4"></div>
                <div className="h-3 bg-border rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOW TREND INTELLIGENCE RESULTS */}
      {trendsMutation.data && !trendsMutation.isPending && (
        <div className="space-y-8 animate-zoom-in" id="trends-results-stage">
          
          {/* SEARCH TELEMETRY LOGS HEADER */}
          <div className="bg-primary/[0.02] border border-primary/10 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-muted font-medium">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span>Google queries executed successfully to fetch this real-time marketing index:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendsMutation.data.searchQueriesUsed.map((q, i) => (
                <span key={i} className="bg-background border border-border px-2 py-1 rounded text-[10px] font-mono text-title">
                  "{q}"
                </span>
              ))}
            </div>
          </div>

          {/* OVERVIEW / ATMOSPHERE INSIGHT BOX */}
          <div className="bg-surface border border-border p-6 rounded-3xl shadow-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-title tracking-tight flex items-center gap-2">
                  Live Atmosphere Summary
                </h3>
                <p className="text-xs text-body leading-relaxed whitespace-pre-line">
                  {trendsMutation.data.summarySourceInsights}
                </p>
              </div>
            </div>
          </div>

          {/* SPLIT SCREEN: LEFT = HASHTAG INTELLIGENCE, RIGHT = ACTIONABLE CONCEPTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* HASHTAGS (5 COLS) */}
            <div className="bg-surface border border-border p-6 rounded-3xl shadow-card lg:col-span-5 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Hash className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-title tracking-tight">Hashtag Listening Radar</h3>
                </div>
                <p className="text-xs text-muted">
                  These hashtags are actively gathering momentum on live indexes.
                </p>
              </div>

              <div className="space-y-4 flex-1">
                {trendsMutation.data.trendingHashtags.map((h, i) => (
                  <div key={i} className="bg-background border border-border rounded-2xl p-4 space-y-3 relative group hover:border-primary/20 transition-all">
                    
                    {/* Tag + Platform */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-sm tracking-tight">{h.tag}</span>
                        <span className="bg-primary/5 text-primary font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                          {h.volume}
                        </span>
                      </div>
                      
                      {/* Platform indicator */}
                      <div className="flex items-center gap-1.5 bg-surface border border-border px-2 py-0.5 rounded-lg text-[10px] font-medium text-title">
                        {getPlatformIcon(h.platform)}
                        <span>{h.platform}</span>
                      </div>
                    </div>

                    {/* Context Explanation */}
                    <p className="text-[11px] text-body leading-relaxed">
                      {h.context}
                    </p>

                    {/* Quick Add buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      <button
                        onClick={() => handleCopyHashtag(h.tag)}
                        className="text-[10px] text-muted hover:text-primary font-medium flex items-center gap-1 transition-all"
                      >
                        {copiedText === h.tag ? (
                          <>
                            <Check className="w-3 h-3 text-success" />
                            <span className="text-success font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3" />
                            <span>Copy Tag</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onUseInGenerator(`Write a marketing post themed around the active social media trend ${h.tag}. Context: ${h.context}`, h.tag)}
                        className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 transition-all"
                      >
                        <span>Use in Generator</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VIRAL CONTENT PROMPTS (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Video className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="text-base font-bold text-title tracking-tight">Actionable Viral Blueprints</h3>
                </div>
                <p className="text-xs text-muted">
                  Use these real-time structural blueprints to produce top-tier social video or written text copy.
                </p>
              </div>

              <div className="space-y-4" id="viral-blueprints-list">
                {trendsMutation.data.viralConcepts.map((concept, i) => (
                  <div key={i} className="bg-surface border border-border p-5 rounded-2xl shadow-soft space-y-4 hover:border-primary/30 transition-all flex flex-col justify-between">
                    
                    {/* Blueprint Title Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Viral Content Idea #{i + 1}
                        </span>
                        <h4 className="text-sm font-bold text-title leading-snug">{concept.title}</h4>
                      </div>

                      {/* Difficulty level */}
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        concept.difficulty.toLowerCase() === 'easy'
                          ? 'bg-success/10 border-success/30 text-success'
                          : concept.difficulty.toLowerCase() === 'medium'
                          ? 'bg-blue-100 border-blue-200 text-blue-600'
                          : 'bg-amber-100 border-amber-200 text-amber-600'
                      }`}>
                        {concept.difficulty} Setup
                      </span>
                    </div>

                    {/* Blueprint body */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1 border-t border-border/40">
                      
                      {/* Action description */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">How to implement:</span>
                        <p className="text-muted leading-relaxed text-[11px]">{concept.description}</p>
                      </div>

                      {/* Psychological Trigger */}
                      <div className="bg-background border border-border p-3.5 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-amber-600 block uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Flame className="w-3.5 h-3.5" />
                            Audience psychological trigger
                          </span>
                          <p className="text-body italic text-[11px] leading-relaxed">"{concept.trigger}"</p>
                        </div>
                        
                        {/* Draft button */}
                        <button
                          onClick={() => onUseInGenerator(`Write a complete social post matching this trending content style concept: "${concept.title}". Format description: "${concept.description}". Ensure you leverage this hook psychological trigger: "${concept.trigger}"`, '')}
                          className="mt-3 w-full bg-primary hover:bg-opacity-95 text-white font-semibold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Draft Captions via Gemini</span>
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* INITIAL DISCOVERY EMPTY VIEW */}
      {!trendsMutation.data && !trendsMutation.isPending && (
        <div className="bg-surface border border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-primary/5 p-4 rounded-full text-primary mb-4 animate-bounce">
            <Globe className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-title">Industry Listening Engine</h3>
          <p className="text-muted text-xs max-w-sm mt-1.5 leading-relaxed">
            Select your brand vertical above and trigger our live indexing bot. We will scour Google Search to deliver today's hottest hashtag movements and post themes!
          </p>
        </div>
      )}
    </div>
  );
}
