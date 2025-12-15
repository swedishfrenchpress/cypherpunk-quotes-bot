import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from './useNostrPublish';
import { Quote, formatQuoteForNostr } from '@/lib/quotes';
import { generateQuoteTags, recordPostedQuote, getBotConfig } from '@/lib/botService';

interface PostQuoteParams {
  quote: Quote;
  includeHashtags?: boolean;
}

/** Hook to post a quote to Nostr */
export function usePostQuote() {
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quote, includeHashtags = true }: PostQuoteParams) => {
      const config = getBotConfig();
      
      // Format the quote content
      let content = formatQuoteForNostr(quote);
      
      // Add hashtags if enabled
      if (includeHashtags) {
        const allTags = [...new Set([...config.hashtags, ...quote.tags.slice(0, 3)])];
        const hashtagString = allTags.map(t => `#${t}`).join(' ');
        content += `\n\n${hashtagString}`;
      }
      
      // Generate tags for the event
      const tags = generateQuoteTags(quote, config);
      
      // Publish the event
      await createEvent({
        kind: 1,
        content,
        tags,
      });
      
      // Record that we posted this quote
      recordPostedQuote(quote.id);
      
      return { quote, content };
    },
    onSuccess: () => {
      // Invalidate any queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['bot-state'] });
    },
  });
}
