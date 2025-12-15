import quotesData from '@/data/quotes.json';

/** A single quote entry */
export interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  year?: number;
  tags: string[];
}

/** The full quotes database structure */
export interface QuotesDatabase {
  version: string;
  lastUpdated: string;
  quotes: Quote[];
}

/** Get all quotes */
export function getAllQuotes(): Quote[] {
  return quotesData.quotes;
}

/** Get a random quote */
export function getRandomQuote(): Quote {
  const quotes = getAllQuotes();
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

/** Get a random quote that hasn't been used recently
 * @param recentIds - Array of quote IDs that have been recently posted
 * @param maxRecent - Maximum number of recent quotes to avoid (default: 20)
 */
export function getRandomQuoteExcluding(recentIds: string[], maxRecent: number = 20): Quote {
  const quotes = getAllQuotes();
  const recentSet = new Set(recentIds.slice(-maxRecent));
  
  // Filter out recent quotes
  const availableQuotes = quotes.filter(q => !recentSet.has(q.id));
  
  // If we've used all quotes, reset and use any
  if (availableQuotes.length === 0) {
    return getRandomQuote();
  }
  
  const randomIndex = Math.floor(Math.random() * availableQuotes.length);
  return availableQuotes[randomIndex];
}

/** Get quotes by author */
export function getQuotesByAuthor(author: string): Quote[] {
  return getAllQuotes().filter(q => 
    q.author.toLowerCase().includes(author.toLowerCase())
  );
}

/** Get quotes by tag */
export function getQuotesByTag(tag: string): Quote[] {
  return getAllQuotes().filter(q => 
    q.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

/** Get all unique authors */
export function getAllAuthors(): string[] {
  const authors = new Set(getAllQuotes().map(q => q.author));
  return Array.from(authors).sort();
}

/** Get all unique tags */
export function getAllTags(): string[] {
  const tags = new Set(getAllQuotes().flatMap(q => q.tags));
  return Array.from(tags).sort();
}

/** Format a quote for Nostr posting */
export function formatQuoteForNostr(quote: Quote): string {
  let content = `"${quote.text}"`;
  content += `\n\n— ${quote.author}`;
  
  if (quote.source && quote.year) {
    content += ` (${quote.source}, ${quote.year})`;
  } else if (quote.source) {
    content += ` (${quote.source})`;
  } else if (quote.year) {
    content += ` (${quote.year})`;
  }
  
  return content;
}

/** Get quote statistics */
export function getQuoteStats(): {
  totalQuotes: number;
  totalAuthors: number;
  totalTags: number;
  quotesByAuthor: Record<string, number>;
} {
  const quotes = getAllQuotes();
  const quotesByAuthor: Record<string, number> = {};
  
  quotes.forEach(q => {
    quotesByAuthor[q.author] = (quotesByAuthor[q.author] || 0) + 1;
  });
  
  return {
    totalQuotes: quotes.length,
    totalAuthors: getAllAuthors().length,
    totalTags: getAllTags().length,
    quotesByAuthor,
  };
}

/** Search quotes by text content */
export function searchQuotes(query: string): Quote[] {
  const lowerQuery = query.toLowerCase();
  return getAllQuotes().filter(q =>
    q.text.toLowerCase().includes(lowerQuery) ||
    q.author.toLowerCase().includes(lowerQuery) ||
    q.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}
