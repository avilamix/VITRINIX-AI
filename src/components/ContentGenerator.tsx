import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Bookmark, 
  Trash2, 
  Send, 
  Smile, 
  HelpCircle, 
  Volume2, 
  Tv, 
  LayoutGrid, 
  FileText, 
  Lightbulb, 
  Smartphone,
  Flame,
  Clock,
  ArrowRight
} from 'lucide-react';

interface GeneratedCaption {
  id: string;
  headline: string;
  body: string;
  hashtags: string[];
  callToAction: string;
}

interface GeneratedIdea {
  id: string;
  title: string;
  visualConcept: string;
  audioSuggestion: string;
  hookText: string;
}

interface GenerationResult {
  captions: GeneratedCaption[];
  ideas: GeneratedIdea[];
}

interface SavedItem {
  id: string;
  platform: string;
  tone: string;
  audience: string;
  topic: string;
  caption: GeneratedCaption;
  idea?: GeneratedIdea;
  savedAt: string;
}

const PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', icon: '📸', color: 'hover:border-pink-500/50 hover:bg-pink-50/10 active:bg-pink-50/20 text-pink-600' },
  { id: 'TikTok', label: 'TikTok', icon: '🎵', color: 'hover:border-cyan-500/50 hover:bg-cyan-50/10 active:bg-cyan-50/20 text-cyan-600' },
  { id: 'LinkedIn', label: 'LinkedIn', icon: '💼', color: 'hover:border-blue-600/50 hover:bg-blue-50/10 active:bg-blue-50/20 text-blue-700' },
  { id: 'Facebook', label: 'Facebook', icon: '👥', color: 'hover:border-blue-500/50 hover:bg-blue-50/10 active:bg-blue-50/20 text-blue-600' },
  { id: 'Twitter/X', label: 'Twitter / X', icon: '🐦', color: 'hover:border-slate-800/50 hover:bg-slate-50/10 active:bg-slate-50/20 text-slate-800 dark:text-slate-200' },
  { id: 'Google', label: 'Google Search', icon: '🔍', color: 'hover:border-red-500/50 hover:bg-red-50/10 active:bg-red-50/20 text-red-600' }
];

const TONES = [
  { id: 'Creative', label: 'Creative', emoji: '🎨' },
  { id: 'Professional', label: 'Professional', emoji: '👔' },
  { id: 'Bold', label: 'Bold', emoji: '⚡' },
  { id: 'Witty', label: 'Witty', emoji: '🧠' },
  { id: 'Casual', label: 'Casual', emoji: '☕' },
  { id: 'Empathetic', label: 'Empathetic', emoji: '💖' }
];

const AUDIENCES = [
  'Tech-savvy Gen Z',
  'Eco-conscious Buyers',
  'Corporate Executives',
  'Fitness Enthusiasts',
  'Small Business Owners',
  'Busy Parents',
  'Online Creators',
  'Luxury Shoppers'
];

const FUN_LOADING_MESSAGES = [
  "Analyzing target audience psychographics...",
  "Calibrating ideal platform engagement index...",
  "Polishing catchy viral hooks...",
  "Injecting optimized call-to-actions...",
  "Organizing trending hashtags...",
  "Formulating visual and sound direction ideas..."
];

interface ContentGeneratorProps {
  prefilledPrompt?: string;
  prefilledKeywords?: string;
  onClearPrefills?: () => void;
}

export default function ContentGenerator({ prefilledPrompt = '', prefilledKeywords = '', onClearPrefills }: ContentGeneratorProps) {
  // Input fields state
  const [platform, setPlatform] = useState('Instagram');
  const [tone, setTone] = useState('Creative');
  const [audience, setAudience] = useState('Tech-savvy Gen Z');
  const [prompt, setPrompt] = useState('');
  const [keywords, setKeywords] = useState('');

  // Handle prefilled trends integration
  useEffect(() => {
    if (prefilledPrompt) {
      setPrompt(prefilledPrompt);
    }
    if (prefilledKeywords) {
      setKeywords(prefilledKeywords);
    }
    if (prefilledPrompt || prefilledKeywords) {
      onClearPrefills?.();
    }
  }, [prefilledPrompt, prefilledKeywords]);
  
  // Dynamic visual layout state
  const [activeTab, setActiveTab] = useState<'captions' | 'ideas'>('captions');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Saved Caption Library state
  const [savedLibrary, setSavedLibrary] = useState<SavedItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  // Load saved library on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vitrinex_saved_content');
      if (stored) {
        setSavedLibrary(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved library", e);
    }
  }, []);

  // Set up loading message rotations
  useEffect(() => {
    let interval: any;
    if (loadingMsgIdx > 0) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % FUN_LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loadingMsgIdx]);

  // React Query Mutation to invoke backend Gemini route
  const generateMutation = useMutation<GenerationResult, Error, void>({
    mutationFn: async () => {
      setLoadingMsgIdx(1); // triggers fun messages loop
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          tone,
          audience,
          prompt,
          keywords
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Content generation request failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setLoadingMsgIdx(0);
      // Automatically reset bookmarks state for new generations
      setSavedIds({});
    },
    onError: () => {
      setLoadingMsgIdx(0);
    }
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveItem = (caption: GeneratedCaption, idea?: GeneratedIdea) => {
    const newItem: SavedItem = {
      id: `saved-${Date.now()}-${caption.id}`,
      platform,
      tone,
      audience,
      topic: prompt.slice(0, 60) + (prompt.length > 60 ? '...' : ''),
      caption,
      idea,
      savedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newItem, ...savedLibrary];
    setSavedLibrary(updated);
    localStorage.setItem('vitrinex_saved_content', JSON.stringify(updated));

    // Mark as bookmarked in the active UI
    setSavedIds(prev => ({
      ...prev,
      [caption.id]: true
    }));
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedLibrary.filter(item => item.id !== id);
    setSavedLibrary(updated);
    localStorage.setItem('vitrinex_saved_content', JSON.stringify(updated));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="content-generator-container">
      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="generator-header">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium tracking-wide text-xs uppercase">
            <Sparkles className="w-4 h-4" />
            <span>AI Copywriting Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-title tracking-tight mt-1">AI Content Copywriter</h1>
          <p className="text-muted text-sm mt-1">
            Instantly formulate optimized hashtags, captions, and visual multimedia ideas for social media.
          </p>
        </div>

        {/* LIBRARY TOGGLE */}
        <button
          id="btn-toggle-saved-library"
          onClick={() => setShowLibrary(!showLibrary)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs border transition-all ${
            showLibrary 
              ? 'bg-primary border-primary text-white shadow-soft' 
              : 'bg-surface border-border text-body hover:bg-background'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Studio Items ({savedLibrary.length})</span>
        </button>
      </div>

      {showLibrary ? (
        /* SAVED STUDIO LIBRARY SCREEN */
        <div className="bg-surface border border-border rounded-3xl p-6 shadow-card space-y-6 animate-zoom-in" id="saved-library-panel">
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-title">Studio Library</h2>
              <p className="text-xs text-muted">Your curated list of high-converting captions and ideas.</p>
            </div>
            <button 
              onClick={() => setShowLibrary(false)}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Back to Creator Panel
            </button>
          </div>

          {savedLibrary.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm space-y-2">
              <p className="font-semibold text-title">No assets saved yet.</p>
              <p className="text-xs">Generate captions below and click save to accumulate high-impact copy templates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="library-grid">
              {savedLibrary.map((item) => (
                <div key={item.id} className="bg-background border border-border rounded-2xl p-5 relative group flex flex-col justify-between">
                  <button
                    onClick={() => handleDeleteSaved(item.id)}
                    className="absolute top-4 right-4 text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface"
                    title="Delete Saved item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-md uppercase">
                        {item.platform}
                      </span>
                      <span className="text-[10px] bg-secondary/15 text-muted font-medium px-2 py-0.5 rounded-md">
                        {item.tone}
                      </span>
                      <span className="text-[10px] text-muted ml-auto mr-6">
                        {item.savedAt}
                      </span>
                    </div>

                    <div className="border-t border-border/50 pt-3">
                      <p className="text-[11px] text-muted italic font-medium mb-2">Topic: "{item.topic}"</p>
                      <h4 className="text-xs font-bold text-title mb-1">{item.caption.headline}</h4>
                      <p className="text-xs text-body whitespace-pre-wrap leading-relaxed">{item.caption.body}</p>
                      
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.caption.hashtags.map((h, i) => (
                          <span key={i} className="text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                            {h}
                          </span>
                        ))}
                      </div>

                      <div className="bg-surface border border-border/60 p-2.5 rounded-xl mt-3 text-[11px] text-body">
                        <span className="font-bold text-title text-[10px] block uppercase text-primary mb-0.5">CTA Goal:</span>
                        {item.caption.callToAction}
                      </div>

                      {item.idea && (
                        <div className="mt-3 bg-primary/[0.02] border border-primary/10 p-3 rounded-xl">
                          <span className="text-[10px] font-bold text-title flex items-center gap-1 mb-1">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />
                            Visual Concept: {item.idea.title}
                          </span>
                          <p className="text-[11px] text-muted">{item.idea.visualConcept}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                    <button
                      onClick={() => handleCopy(`${item.caption.headline}\n\n${item.caption.body}\n\n${item.caption.hashtags.join(' ')}\n\n${item.caption.callToAction}`, item.id)}
                      className="w-full flex items-center justify-center gap-1 text-[11px] font-medium bg-surface hover:bg-background border border-border py-1.5 rounded-lg text-title transition-all"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-success" />
                          <span className="text-success font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Complete Post</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE CREATOR WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="active-creator-workspace">
          
          {/* LEFT: GENERATION FORM CONTROL PANEL (5 COLS) */}
          <div className="bg-surface border border-border p-6 rounded-3xl shadow-card lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-title uppercase tracking-wider mb-2">1. Target Channel</h3>
                <div className="grid grid-cols-3 gap-2" id="grid-platform-select">
                  {PLATFORMS.map((plat) => (
                    <button
                      key={plat.id}
                      id={`platform-btn-${plat.id.toLowerCase()}`}
                      type="button"
                      onClick={() => setPlatform(plat.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center ${
                        platform === plat.id
                          ? 'bg-primary/5 border-primary shadow-soft font-semibold text-primary'
                          : 'bg-background border-border text-muted hover:text-title hover:border-border/80'
                      }`}
                    >
                      <span className="text-xl mb-1">{plat.icon}</span>
                      <span className="text-[10px] truncate w-full">{plat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-title uppercase tracking-wider mb-2">2. Brand Voice Tone</h3>
                <div className="grid grid-cols-3 gap-2" id="grid-tone-select">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      id={`tone-btn-${t.id.toLowerCase()}`}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all text-xs font-medium justify-center ${
                        tone === t.id
                          ? 'bg-primary text-white border-primary shadow-soft'
                          : 'bg-background border-border text-body hover:bg-surface'
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-bold text-title uppercase tracking-wider">3. Audience Profile</h3>
                  <span className="text-[10px] text-muted">Who is this content for?</span>
                </div>
                <input
                  type="text"
                  id="audience-input"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-title mb-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Describe your audience segment..."
                />
                
                {/* Suggestions chips */}
                <div className="flex flex-wrap gap-1.5" id="audience-suggestions">
                  {AUDIENCES.map((aud) => (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setAudience(aud)}
                      className={`text-[9px] px-2.5 py-1 rounded-full border transition-all ${
                        audience === aud
                          ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                          : 'bg-background text-muted border-border hover:text-title'
                      }`}
                    >
                      {aud}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-title uppercase tracking-wider mb-2">4. Context & Topic Details</h3>
                <textarea
                  id="generator-topic-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., We are launching a premium organic matcha tea set that includes a hand-carved bamboo whisk. It promises calm energy and focus without the coffee crash."
                  required
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted/60 leading-relaxed"
                ></textarea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <h3 className="text-sm font-bold text-title uppercase tracking-wider">5. Keywords to Weave In</h3>
                  <span className="text-[10px] text-muted">Optional</span>
                </div>
                <input
                  type="text"
                  id="keywords-input"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., Matcha ritual, ceremonial quality, sustained energy"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted/60"
                />
              </div>
            </div>

            <button
              id="btn-trigger-generation"
              disabled={generateMutation.isPending || !prompt.trim()}
              onClick={() => generateMutation.mutate()}
              className="w-full bg-primary hover:bg-opacity-95 text-white font-semibold text-xs py-3 rounded-xl shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {generateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Drafting Copy via Gemini...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Generate Content Options</span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT: LIVE STUDIO RESULTS WINDOW (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col min-h-[500px]" id="studio-results-canvas">
            
            {/* NO INPUT/GENERATION INITIAL VIEW */}
            {!generateMutation.data && !generateMutation.isPending && (
              <div className="bg-surface border border-border rounded-3xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="bg-primary/5 p-4 rounded-full text-primary mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-title">Creator Studio Workspace</h3>
                <p className="text-muted text-xs max-w-sm mt-1.5 leading-relaxed">
                  Provide context, choose your target channel, and trigger Gemini above to design custom hashtags, copy variations, and post concepts.
                </p>
                
                {/* Visual workflow steps */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-8 border-t border-border pt-6 text-left">
                  <div className="bg-background border border-border/80 p-3 rounded-2xl">
                    <span className="text-[11px] font-bold text-primary block">Step 1</span>
                    <span className="text-[10px] text-muted">Define your post details & audience.</span>
                  </div>
                  <div className="bg-background border border-border/80 p-3 rounded-2xl">
                    <span className="text-[11px] font-bold text-primary block">Step 2</span>
                    <span className="text-[10px] text-muted">Leverage the Gemini model.</span>
                  </div>
                  <div className="bg-background border border-border/80 p-3 rounded-2xl">
                    <span className="text-[11px] font-bold text-primary block">Step 3</span>
                    <span className="text-[10px] text-muted">Review, refine & copy directly.</span>
                  </div>
                </div>
              </div>
            )}

            {/* GENERATION IN PROGRESS SCREEN */}
            {generateMutation.isPending && (
              <div className="bg-surface border border-border rounded-3xl p-8 flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-title animate-pulse">Writing Conversions-Ready Copy...</h3>
                  <div className="bg-background border border-border px-4 py-2 rounded-xl text-xs text-muted font-medium w-64 mx-auto min-h-[40px] flex items-center justify-center">
                    {FUN_LOADING_MESSAGES[loadingMsgIdx]}
                  </div>
                </div>

                <div className="space-y-3 w-full max-w-md border-t border-border pt-6 text-left">
                  <div className="bg-background/50 h-10 rounded-xl animate-pulse flex items-center px-4 justify-between">
                    <div className="bg-border h-3.5 w-1/3 rounded"></div>
                    <div className="bg-border h-3 w-10 rounded"></div>
                  </div>
                  <div className="bg-background/50 h-20 rounded-xl animate-pulse flex flex-col p-4 justify-between">
                    <div className="bg-border h-3 w-3/4 rounded"></div>
                    <div className="bg-border h-3 w-1/2 rounded"></div>
                    <div className="bg-border h-3 w-2/3 rounded"></div>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS LOADED CANVAS */}
            {generateMutation.data && !generateMutation.isPending && (
              <div className="bg-surface border border-border rounded-3xl p-6 shadow-soft flex-1 flex flex-col justify-between space-y-6 animate-zoom-in">
                
                {/* Result Control Nav Tabs */}
                <div>
                  <div className="flex justify-between items-center pb-4 border-b border-border flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-title flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        AI Generation Complete
                      </h3>
                      <p className="text-[10px] text-muted">Optimized for {platform} with {tone} brand voice.</p>
                    </div>

                    <div className="flex bg-background p-0.5 rounded-lg border border-border">
                      <button
                        onClick={() => setActiveTab('captions')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                          activeTab === 'captions'
                            ? 'bg-surface text-primary shadow-sm border border-border'
                            : 'text-muted'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Captions
                      </button>
                      <button
                        onClick={() => setActiveTab('ideas')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                          activeTab === 'ideas'
                            ? 'bg-surface text-primary shadow-sm border border-border'
                            : 'text-muted'
                        }`}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        Multimedia Layouts
                      </button>
                    </div>
                  </div>
                </div>

                {/* TAB 1: CAPTIONS SCROLL */}
                {activeTab === 'captions' && (
                  <div className="flex-1 space-y-5 overflow-y-auto max-h-[500px] pr-1" id="captions-tab-content">
                    {generateMutation.data.captions.map((caption, idx) => (
                      <div 
                        key={caption.id} 
                        className="bg-background border border-border rounded-2xl p-4 space-y-3 relative group hover:border-primary/30 transition-all"
                      >
                        {/* Mock Avatar for Social Feel */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            VX
                          </div>
                          <div>
                            <span className="font-semibold text-title text-xs block">VitrineX Studio</span>
                            <span className="text-[9px] text-muted flex items-center gap-0.5">
                              <Smartphone className="w-2.5 h-2.5 text-muted" />
                              Ad Variation #{idx + 1}
                            </span>
                          </div>

                          <div className="ml-auto flex items-center gap-1.5 opacity-100 lg:opacity-60 group-hover:opacity-100 transition-all">
                            {/* Save Item to Library */}
                            <button
                              onClick={() => handleSaveItem(caption, generateMutation.data.ideas[idx])}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                savedIds[caption.id]
                                  ? 'bg-success/10 border-success/30 text-success'
                                  : 'bg-surface border-border text-muted hover:text-primary hover:bg-background'
                              }`}
                              title="Save copy to library"
                              disabled={savedIds[caption.id]}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopy(`${caption.headline}\n\n${caption.body}\n\n${caption.hashtags.join(' ')}\n\n${caption.callToAction}`, caption.id)}
                              className="p-1.5 rounded-lg border bg-surface border-border text-muted hover:text-primary hover:bg-background transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedId === caption.id ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Copy Body */}
                        <div className="space-y-1.5 text-xs text-body leading-relaxed">
                          <h4 className="font-bold text-title">{caption.headline}</h4>
                          <p className="whitespace-pre-wrap">{caption.body}</p>
                          
                          {/* Hashtags display */}
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {caption.hashtags.map((tag, tIdx) => (
                              <span key={tIdx} className="bg-primary/5 text-primary text-[10px] px-2 py-0.5 rounded font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Call To Action Box */}
                          <div className="bg-surface border border-border/80 p-2.5 rounded-xl mt-3 text-[11px] flex items-start gap-1.5">
                            <span className="text-[10px] font-bold text-primary uppercase mt-0.5 shrink-0">Goal:</span>
                            <span className="text-title italic">"{caption.callToAction}"</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: MULTIMEDIA VIDEO & VISUAL SUGGESTIONS */}
                {activeTab === 'ideas' && (
                  <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px]" id="ideas-tab-content">
                    <p className="text-[11px] text-muted px-1">
                      Gemini has formulated matches of visual prompts, hooks, and audios that align with each copy variation.
                    </p>

                    {generateMutation.data.ideas.map((idea, idx) => (
                      <div 
                        key={idea.id} 
                        className="bg-background border border-border rounded-2xl p-4 hover:border-primary/30 transition-all space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-muted">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-title">{idea.title}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
                          {/* Visual concept */}
                          <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-title flex items-center gap-1 mb-1 text-primary">
                              <Tv className="w-3.5 h-3.5" />
                              Visual Shot
                            </span>
                            <p className="text-muted leading-relaxed flex-1">{idea.visualConcept}</p>
                          </div>

                          {/* Audio/music suggestion */}
                          <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-title flex items-center gap-1 mb-1 text-primary">
                              <Volume2 className="w-3.5 h-3.5" />
                              Sound Suggestion
                            </span>
                            <p className="text-muted leading-relaxed flex-1">{idea.audioSuggestion}</p>
                          </div>

                          {/* Title Overlay / Hook Text */}
                          <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-title flex items-center gap-1 mb-1 text-primary">
                              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                              3-Sec Hook Text
                            </span>
                            <p className="font-bold text-title italic leading-relaxed flex-1">"{idea.hookText}"</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Tip bar */}
                <div className="bg-primary/5 p-3.5 rounded-2xl border border-primary/10 text-[10px] text-muted flex items-center justify-between">
                  <span>✨ Tip: Match your visual concept to trending reel audios for higher reach index on social feeds.</span>
                  <button 
                    onClick={() => {
                      // Trigger copy of all generated captions
                      const allText = generateMutation.data.captions.map((c, i) => `Variation #${i+1}:\n${c.headline}\n${c.body}\n${c.hashtags.join(' ')}\n\n`).join('\n');
                      handleCopy(allText, 'all-caps');
                    }}
                    className="text-primary hover:underline font-bold"
                  >
                    {copiedId === 'all-caps' ? 'Copied all!' : 'Copy all variations'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
