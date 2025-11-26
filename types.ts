export interface TranscriptionSegment {
  text: string;
  isFinal: boolean;
}

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// For Gemini API window object
declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}
export {};