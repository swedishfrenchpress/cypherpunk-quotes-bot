/**
 * Cypherpunk Quotes Bot - Standalone posting script
 * 
 * This script can be run via GitHub Actions, cron jobs, or any Node.js environment
 * to automatically post quotes to Nostr.
 * 
 * Environment variables required:
 * - NOSTR_PRIVATE_KEY: The bot's private key (hex or nsec format)
 * 
 * Optional environment variables:
 * - RELAYS: Comma-separated list of relay URLs (default: uses built-in list)
 * - STATE_FILE: Path to state file for tracking posted quotes (default: ./bot-state.json)
 */

// WebSocket polyfill for Node.js
import { WebSocket } from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

import { generateSecretKey, getPublicKey, finalizeEvent, NostrEvent } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';
import { nip19 } from 'nostr-tools';
import * as fs from 'fs';

// Import quotes data
import quotesData from '../src/data/quotes.json';

interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  year?: number;
  tags: string[];
}

interface BotState {
  recentQuoteIds: string[];
  lastPostTimestamp: number;
  totalPostsCount: number;
}

// Configuration
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.ditto.pub',
];

const STATE_FILE = process.env.STATE_FILE || './bot-state.json';

/**
 * Normalize hashtag by removing dashes and spaces
 * This ensures hashtags work properly on Nostr (e.g., "open-source" -> "opensource")
 */
function normalizeHashtag(tag: string): string {
  return tag.toLowerCase().replace(/[-\s]/g, '');
}

/**
 * Load bot state from file
 */
function loadState(): BotState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('No existing state file, starting fresh');
  }
  return { recentQuoteIds: [], lastPostTimestamp: 0, totalPostsCount: 0 };
}

/**
 * Save bot state to file
 */
function saveState(state: BotState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('State saved');
}

/**
 * Query Nostr for recent posts from the bot to get quote IDs that were actually posted
 * This helps prevent duplicates even if the state file is lost or reset
 */
async function getRecentPostedQuoteIds(
  pubkey: string,
  relayUrls: string[],
  daysBack: number = 30
): Promise<string[]> {
  const quoteIds: string[] = [];
  const since = Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000);
  
  // Try to query from at least one relay
  for (const url of relayUrls) {
    let relay: Relay | null = null;
    try {
      console.log(`Querying ${url} for recent posts...`);
      relay = await Relay.connect(url);
      
      // Collect events from subscription
      const events: NostrEvent[] = [];
      let subscriptionClosed = false;
      
      // Query for kind 1 events from this bot
      const sub = relay.subscribe([
        {
          kinds: [1],
          authors: [pubkey],
          since,
          limit: 100,
        }
      ], {
        onevent: (event) => {
          events.push(event);
        },
        oneose: () => {
          subscriptionClosed = true;
        }
      });
      
      // Wait for events to come in (with timeout)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (!subscriptionClosed) {
            sub.close();
          }
          resolve();
        }, 5000); // 5 second timeout
        
        // Also try to close after collecting events for a bit
        setTimeout(() => {
          clearTimeout(timeout);
          if (!subscriptionClosed) {
            sub.close();
          }
          resolve();
        }, 3000);
      });
      
      // Extract quote IDs from collected events
      for (const event of events) {
        const quoteIdTag = event.tags.find(tag => tag[0] === 'quote_id');
        if (quoteIdTag && quoteIdTag[1]) {
          quoteIds.push(quoteIdTag[1]);
        }
      }
      
      // If we got results from this relay, we can break early
      if (quoteIds.length > 0) {
        console.log(`Found ${quoteIds.length} quote IDs from ${url}`);
        break;
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`⚠️  Could not query ${url}: ${message}`);
    } finally {
      if (relay) {
        await new Promise(resolve => setTimeout(resolve, 500));
        relay.close();
      }
    }
  }
  
  // Remove duplicates and return
  return [...new Set(quoteIds)];
}

/**
 * Get a random quote that hasn't been posted recently
 * Combines state file data with actual Nostr posts for better duplicate prevention
 */
async function getRandomQuote(
  recentIds: string[],
  pubkey: string,
  relayUrls: string[]
): Promise<Quote> {
  const quotes = quotesData.quotes as Quote[];
  
  // Query Nostr for recently posted quote IDs
  console.log('Checking Nostr for recently posted quotes...');
  const nostrQuoteIds = await getRecentPostedQuoteIds(pubkey, relayUrls, 30);
  console.log(`Found ${nostrQuoteIds.length} quote IDs from Nostr posts`);
  
  // Combine state file IDs with Nostr IDs
  const allRecentIds = [...new Set([...recentIds, ...nostrQuoteIds])];
  const recentSet = new Set(allRecentIds.slice(-100)); // Check last 100 quotes (increased from 50)
  
  const availableQuotes = quotes.filter(q => !recentSet.has(q.id));
  
  // If we've used all quotes, reset
  if (availableQuotes.length === 0) {
    console.log('⚠️  All quotes have been posted recently. Selecting random quote anyway.');
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  }
  
  const randomIndex = Math.floor(Math.random() * availableQuotes.length);
  return availableQuotes[randomIndex];
}

/**
 * Format a quote for posting
 */
function formatQuote(quote: Quote): string {
  let content = `"${quote.text}"`;
  content += `\n\n— ${quote.author}`;
  
  if (quote.source && quote.year) {
    content += ` (${quote.source}, ${quote.year})`;
  } else if (quote.source) {
    content += ` (${quote.source})`;
  } else if (quote.year) {
    content += ` (${quote.year})`;
  }
  
  // Add hashtags from quote (normalized to remove dashes and spaces)
  // Only use quote-specific tags, no generic defaults
  if (quote.tags.length > 0) {
    const normalizedTags = quote.tags.map(t => normalizeHashtag(t));
    content += `\n\n${normalizedTags.map(t => `#${t}`).join(' ')}`;
  }
  
  return content;
}

/**
 * Generate event tags
 */
function generateTags(quote: Quote): string[][] {
  const tags: string[][] = [];
  
  // Add hashtags from quote (normalized to remove dashes and spaces)
  // Only use quote-specific tags, no generic defaults
  quote.tags.forEach(tag => {
    const normalizedTag = normalizeHashtag(tag);
    tags.push(['t', normalizedTag]);
  });
  
  // Add author as tag (normalized to remove dashes and spaces)
  const authorTag = normalizeHashtag(quote.author);
  tags.push(['t', authorTag]);
  
  // Add quote ID tag for duplicate prevention
  // This allows us to query Nostr to see which quotes were actually posted
  tags.push(['quote_id', quote.id]);
  
  // Add client tag
  tags.push(['client', 'Cypherpunk Quotes Bot']);
  
  return tags;
}

/**
 * Parse private key from environment (supports both hex and nsec)
 */
function parsePrivateKey(keyStr: string): Uint8Array {
  // Remove any whitespace
  keyStr = keyStr.trim();
  
  // Check if it's nsec format
  if (keyStr.startsWith('nsec1')) {
    const decoded = nip19.decode(keyStr);
    if (decoded.type !== 'nsec') {
      throw new Error('Invalid nsec key');
    }
    return decoded.data;
  }
  
  // Assume hex format
  if (keyStr.length !== 64) {
    throw new Error('Invalid hex private key length');
  }
  
  return Uint8Array.from(Buffer.from(keyStr, 'hex'));
}

/**
 * Publish event to relays
 */
async function publishToRelays(event: NostrEvent, relayUrls: string[]): Promise<void> {
  const results: { relay: string; success: boolean; error?: string }[] = [];
  
  for (const url of relayUrls) {
    let relay: Relay | null = null;
    try {
      console.log(`Connecting to ${url}...`);
      relay = await Relay.connect(url);
      
      // Publish the event - in newer versions of nostr-tools, this returns a Promise
      // Add a timeout to prevent hanging
      const publishPromise = relay.publish(event);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for relay confirmation')), 10000);
      });
      
      await Promise.race([publishPromise, timeoutPromise]);
      
      // If we get here, the publish succeeded
      console.log(`✓ Published to ${url}`);
      results.push({ relay: url, success: true });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      // "duplicate" errors mean the event was already published - treat as success
      // This happens when the event was successfully posted but the relay reports it as duplicate
      if (message.toLowerCase().includes('duplicate')) {
        console.log(`✓ Published to ${url} (already exists)`);
        results.push({ relay: url, success: true });
      } else {
        console.log(`✗ Failed to publish to ${url}: ${message}`);
        results.push({ relay: url, success: false, error: message });
      }
    } finally {
      if (relay) {
        // Give a moment before closing
        await new Promise(resolve => setTimeout(resolve, 500));
        relay.close();
      }
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\nPublished to ${successCount}/${relayUrls.length} relays`);
  
  if (successCount === 0) {
    throw new Error('Failed to publish to any relay');
  }
}

/**
 * Main bot function
 */
async function main(): Promise<void> {
  console.log('🔐 Cypherpunk Quotes Bot Starting...\n');
  
  // Get private key from environment
  const privateKeyStr = process.env.NOSTR_PRIVATE_KEY;
  if (!privateKeyStr) {
    // Generate a new keypair for testing
    console.log('⚠️  No NOSTR_PRIVATE_KEY set. Generating ephemeral keypair for testing...\n');
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    console.log('Generated pubkey:', nip19.npubEncode(pk));
    console.log('Generated nsec:', nip19.nsecEncode(sk));
    console.log('\nTo use this keypair, set NOSTR_PRIVATE_KEY environment variable.\n');
    
    // For testing, we'll use this ephemeral key
    process.env.NOSTR_PRIVATE_KEY = Buffer.from(sk).toString('hex');
  }
  
  const secretKey = parsePrivateKey(process.env.NOSTR_PRIVATE_KEY!);
  const pubkey = getPublicKey(secretKey);
  
  console.log(`Bot pubkey: ${nip19.npubEncode(pubkey)}`);
  console.log(`Bot hex: ${pubkey}\n`);
  
  // Load state
  const state = loadState();
  console.log(`Previous posts: ${state.totalPostsCount}`);
  console.log(`Recent quotes tracked: ${state.recentQuoteIds.length}\n`);
  
  // Get relay list
  const relays = process.env.RELAYS 
    ? process.env.RELAYS.split(',').map(r => r.trim())
    : DEFAULT_RELAYS;
  
  console.log('Relays:', relays.join(', '), '\n');
  
  // Select a random quote (checks both state file and Nostr)
  const quote = await getRandomQuote(state.recentQuoteIds, pubkey, relays);
  console.log(`Selected quote by: ${quote.author}`);
  console.log(`Quote ID: ${quote.id}\n`);
  
  // Format the content
  const content = formatQuote(quote);
  console.log('Content:\n---');
  console.log(content);
  console.log('---\n');
  
  // Generate tags
  const tags = generateTags(quote);
  
  // Create the event
  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  };
  
  // Sign the event
  const event = finalizeEvent(eventTemplate, secretKey);
  
  console.log('Event ID:', event.id);
  console.log('Event sig:', event.sig.substring(0, 32) + '...\n');
  
  // Publish to relays
  await publishToRelays(event, relays);
  
  // Update state
  state.recentQuoteIds.push(quote.id);
  state.lastPostTimestamp = Date.now();
  state.totalPostsCount += 1;
  
  // Keep only last 100 quote IDs (increased to match getRandomQuote)
  if (state.recentQuoteIds.length > 100) {
    state.recentQuoteIds = state.recentQuoteIds.slice(-100);
  }
  
  saveState(state);
  
  console.log(`\n✅ Post ${state.totalPostsCount} complete!`);
}

// Run the bot
main().catch((error) => {
  console.error('❌ Bot error:', error);
  process.exit(1);
});
