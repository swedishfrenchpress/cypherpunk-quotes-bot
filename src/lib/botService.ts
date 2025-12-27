import { Quote, formatQuoteForNostr } from './quotes';

/** Bot configuration */
export interface BotConfig {
  relays: string[];
  intervalHours: number;
  hashtags: string[];
}

/** Default bot configuration */
export const DEFAULT_BOT_CONFIG: BotConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://relay.ditto.pub',
  ],
  intervalHours: 8,
  hashtags: ['cypherpunk', 'bitcoin', 'privacy', 'freedom'],
};

/** Storage key for bot state in localStorage */
const BOT_STATE_KEY = 'cypherpunk-bot:state';
const BOT_CONFIG_KEY = 'cypherpunk-bot:config';

/** Bot state persisted in localStorage */
export interface BotState {
  recentQuoteIds: string[];
  lastPostTimestamp: number;
  totalPostsCount: number;
}

/** Get bot state from localStorage */
export function getBotState(): BotState {
  if (typeof window === 'undefined') {
    return { recentQuoteIds: [], lastPostTimestamp: 0, totalPostsCount: 0 };
  }
  
  const stored = localStorage.getItem(BOT_STATE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { recentQuoteIds: [], lastPostTimestamp: 0, totalPostsCount: 0 };
    }
  }
  return { recentQuoteIds: [], lastPostTimestamp: 0, totalPostsCount: 0 };
}

/** Save bot state to localStorage */
export function saveBotState(state: BotState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BOT_STATE_KEY, JSON.stringify(state));
}

/** Get bot config from localStorage */
export function getBotConfig(): BotConfig {
  if (typeof window === 'undefined') return DEFAULT_BOT_CONFIG;
  
  const stored = localStorage.getItem(BOT_CONFIG_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_BOT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_BOT_CONFIG;
    }
  }
  return DEFAULT_BOT_CONFIG;
}

/** Save bot config to localStorage */
export function saveBotConfig(config: Partial<BotConfig>): void {
  if (typeof window === 'undefined') return;
  const current = getBotConfig();
  localStorage.setItem(BOT_CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/** Record a posted quote */
export function recordPostedQuote(quoteId: string): void {
  const state = getBotState();
  
  // Keep only last 50 quote IDs to prevent excessive repetition
  state.recentQuoteIds = [...state.recentQuoteIds, quoteId].slice(-50);
  state.lastPostTimestamp = Date.now();
  state.totalPostsCount += 1;
  
  saveBotState(state);
}

/** Generate Nostr event tags for a quote */
export function generateQuoteTags(quote: Quote, config: BotConfig): string[][] {
  const tags: string[][] = [];
  
  // Add configured hashtags
  config.hashtags.forEach(tag => {
    tags.push(['t', tag]);
  });
  
  // Add quote-specific tags
  quote.tags.forEach(tag => {
    if (!config.hashtags.includes(tag)) {
      tags.push(['t', tag]);
    }
  });
  
  // Add author as a tag (normalized)
  const authorTag = quote.author.toLowerCase().replace(/\s+/g, '-');
  tags.push(['t', authorTag]);
  
  // Add client tag
  tags.push(['client', 'Cypherpunk Quotes Bot']);
  
  return tags;
}

/** Check if it's time to post (based on interval) */
export function shouldPost(intervalHours: number): boolean {
  const state = getBotState();
  const now = Date.now();
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  return (now - state.lastPostTimestamp) >= intervalMs;
}

/** Get time until next scheduled post */
export function getTimeUntilNextPost(intervalHours: number): {
  hours: number;
  minutes: number;
  seconds: number;
  canPostNow: boolean;
} {
  const state = getBotState();
  const now = Date.now();
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const nextPostTime = state.lastPostTimestamp + intervalMs;
  const remaining = Math.max(0, nextPostTime - now);
  
  return {
    hours: Math.floor(remaining / (60 * 60 * 1000)),
    minutes: Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)),
    seconds: Math.floor((remaining % (60 * 1000)) / 1000),
    canPostNow: remaining === 0,
  };
}

/** Format content with hashtags for display */
export function formatQuoteWithHashtags(quote: Quote, config: BotConfig): string {
  let content = formatQuoteForNostr(quote);
  
  // Add hashtags at the end
  const allTags = [...new Set([...config.hashtags, ...quote.tags.slice(0, 3)])];
  const hashtagString = allTags.map(t => `#${t}`).join(' ');
  
  content += `\n\n${hashtagString}`;
  
  return content;
}
