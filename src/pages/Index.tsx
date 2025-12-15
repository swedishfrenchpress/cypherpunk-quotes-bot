import { useSeoMeta } from '@unhead/react';
import { useState, useEffect, useMemo } from 'react';
import { 
  Terminal, 
  Quote as QuoteIcon, 
  Users, 
  Send, 
  Clock, 
  Shuffle,
  Settings,
  BarChart3,
  Zap,
  Lock,
  Eye,
  ChevronRight,
  Check,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePostQuote } from '@/hooks/usePostQuote';
import { 
  getAllQuotes, 
  getRandomQuoteExcluding, 
  getQuoteStats, 
  getAllAuthors,
  getAllTags,
  searchQuotes,
  Quote 
} from '@/lib/quotes';
import { 
  getBotState, 
  getBotConfig, 
  getTimeUntilNextPost,
  formatQuoteWithHashtags
} from '@/lib/botService';

const Index = () => {
  useSeoMeta({
    title: 'Cypherpunk Quotes Bot | Nostr',
    description: 'An automated Nostr bot posting quotes from cypherpunks, cryptographers, hackers, and digital rights activists.',
  });

  const { user } = useCurrentUser();
  const { mutate: postQuote, isPending: isPosting } = usePostQuote();
  const { toast } = useToast();
  
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, canPostNow: true });
  
  const quotes = useMemo(() => getAllQuotes(), []);
  const stats = useMemo(() => getQuoteStats(), []);
  const authors = useMemo(() => getAllAuthors(), []);
  const tags = useMemo(() => getAllTags(), []);
  const botState = getBotState();
  const botConfig = getBotConfig();
  
  // Filter quotes based on search and filters
  const filteredQuotes = useMemo(() => {
    let result = quotes;
    
    if (searchQuery) {
      result = searchQuotes(searchQuery);
    }
    
    if (selectedAuthor) {
      result = result.filter(q => q.author === selectedAuthor);
    }
    
    if (selectedTag) {
      result = result.filter(q => q.tags.includes(selectedTag));
    }
    
    return result;
  }, [quotes, searchQuery, selectedAuthor, selectedTag]);
  
  // Initialize with a random quote
  useEffect(() => {
    if (!selectedQuote) {
      const quote = getRandomQuoteExcluding(botState.recentQuoteIds);
      setSelectedQuote(quote);
    }
  }, [selectedQuote, botState.recentQuoteIds]);
  
  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getTimeUntilNextPost(botConfig.intervalHours));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [botConfig.intervalHours]);
  
  const handleRandomQuote = () => {
    const quote = getRandomQuoteExcluding(botState.recentQuoteIds);
    setSelectedQuote(quote);
  };
  
  const handleSelectQuote = (quote: Quote) => {
    setSelectedQuote(quote);
  };
  
  const handlePost = () => {
    if (!selectedQuote) return;
    
    postQuote(
      { quote: selectedQuote, includeHashtags: true },
      {
        onSuccess: () => {
          toast({
            title: 'Quote posted!',
            description: `Successfully posted quote by ${selectedQuote.author}`,
          });
          // Select a new random quote
          handleRandomQuote();
        },
        onError: (error) => {
          toast({
            title: 'Failed to post',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen gradient-cyber">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Terminal className="h-8 w-8 text-primary animate-glow" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight terminal-text">Cypherpunk Quotes</h1>
              <p className="text-xs text-muted-foreground">Automated Nostr Bot</p>
            </div>
          </div>
          
          <LoginArea className="max-w-60" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-8 md:p-12">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 max-w-2xl">
              <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
                <Lock className="h-3 w-3 mr-1" />
                Privacy • Freedom • Code
              </Badge>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                Wisdom from the Cypherpunks
              </h2>
              
              <p className="text-muted-foreground text-lg mb-6">
                A curated collection of quotes from cryptographers, hackers, and digital rights activists 
                who shaped the future of privacy and freedom. Follow this bot on Nostr for daily inspiration.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <QuoteIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong className="text-primary">{stats.totalQuotes}</strong> quotes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  <span><strong className="text-accent">{stats.totalAuthors}</strong> authors</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong className="text-primary">{botState.totalPostsCount}</strong> posts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quote Preview & Post */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Quote Card */}
            <Card className="border-primary/20 bg-card/80 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Quote Preview
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRandomQuote}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Random
                  </Button>
                </div>
                <CardDescription>
                  Preview how the quote will appear on Nostr
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {selectedQuote ? (
                  <div className="space-y-4">
                    <blockquote className="relative pl-6 border-l-4 border-primary/50 py-4">
                      <QuoteIcon className="absolute -left-3 -top-2 h-6 w-6 text-primary/30" />
                      <p className="text-lg leading-relaxed italic text-foreground/90">
                        "{selectedQuote.text}"
                      </p>
                    </blockquote>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">— {selectedQuote.author}</p>
                        {(selectedQuote.source || selectedQuote.year) && (
                          <p className="text-sm text-muted-foreground">
                            {selectedQuote.source && selectedQuote.year 
                              ? `${selectedQuote.source}, ${selectedQuote.year}`
                              : selectedQuote.source || selectedQuote.year}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {selectedQuote.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Separator className="bg-border/50" />
                    
                    {/* Post Preview */}
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Terminal className="h-3 w-3" />
                        Nostr Post Preview:
                      </p>
                      <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/80">
                        {formatQuoteWithHashtags(selectedQuote, botConfig)}
                      </pre>
                    </div>
                    
                    {/* Post Button */}
                    {user ? (
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        onClick={handlePost}
                        disabled={isPosting}
                      >
                        {isPosting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Post to Nostr
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border">
                        <p className="text-muted-foreground mb-2">Log in with Nostr to post quotes</p>
                        <LoginArea className="justify-center" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Quote Browser */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  Browse Quotes
                </CardTitle>
                <CardDescription>
                  Search and filter through the quote database
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quotes, authors, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-muted/30 border-border/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedAuthor || ''}
                      onChange={(e) => setSelectedAuthor(e.target.value || null)}
                      className="px-3 py-2 rounded-md bg-muted/30 border border-border/50 text-sm"
                    >
                      <option value="">All Authors</option>
                      {authors.map(author => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </select>
                    {(selectedAuthor || selectedTag || searchQuery) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedAuthor(null);
                          setSelectedTag(null);
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Results Count */}
                <p className="text-sm text-muted-foreground">
                  Showing {filteredQuotes.length} of {quotes.length} quotes
                </p>
                
                {/* Quote List */}
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {filteredQuotes.map((quote) => (
                      <button
                        key={quote.id}
                        onClick={() => handleSelectQuote(quote)}
                        className={`w-full text-left p-4 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5 ${
                          selectedQuote?.id === quote.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border/50 bg-muted/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2 mb-2">
                              "{quote.text}"
                            </p>
                            <p className="text-xs text-primary font-medium">
                              — {quote.author}
                            </p>
                          </div>
                          {selectedQuote?.id === quote.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bot Status */}
            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Bot Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Posts</span>
                  <span className="font-mono font-bold text-primary">{botState.totalPostsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Post Interval</span>
                  <span className="font-mono">{botConfig.intervalHours}h</span>
                </div>
                <Separator className="bg-border/30" />
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next scheduled post:
                  </p>
                  {countdown.canPostNow ? (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      Ready to post
                    </Badge>
                  ) : (
                    <p className="font-mono text-xl">
                      {String(countdown.hours).padStart(2, '0')}:
                      {String(countdown.minutes).padStart(2, '0')}:
                      {String(countdown.seconds).padStart(2, '0')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="authors" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                    <TabsTrigger value="authors">Authors</TabsTrigger>
                    <TabsTrigger value="tags">Tags</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="authors" className="mt-4">
                    <ScrollArea className="h-[250px]">
                      <div className="space-y-2">
                        {Object.entries(stats.quotesByAuthor)
                          .sort(([,a], [,b]) => b - a)
                          .map(([author, count]) => (
                            <button
                              key={author}
                              onClick={() => {
                                setSelectedAuthor(author);
                                setSearchQuery('');
                                setSelectedTag(null);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors text-left"
                            >
                              <span className="text-sm truncate pr-2">{author}</span>
                              <Badge variant="secondary" className="flex-shrink-0">
                                {count}
                              </Badge>
                            </button>
                          ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="tags" className="mt-4">
                    <ScrollArea className="h-[250px]">
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={`cursor-pointer transition-colors ${
                              selectedTag === tag 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'hover:bg-primary/10 hover:border-primary/50'
                            }`}
                            onClick={() => {
                              setSelectedTag(selectedTag === tag ? null : tag);
                              setSearchQuery('');
                              setSelectedAuthor(null);
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Featured Authors */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Featured Voices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Satoshi Nakamoto', 'Tim May', 'Eric Hughes', 'Edward Snowden', 'Julian Assange'].map(author => (
                    <button
                      key={author}
                      onClick={() => {
                        setSelectedAuthor(author);
                        setSearchQuery('');
                        setSelectedTag(null);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                        <span className="text-xs font-bold">{author.charAt(0)}</span>
                      </div>
                      <span className="text-sm flex-1 text-left">{author}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-8 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Terminal className="h-4 w-4" />
              <span>Cypherpunks write code.</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Privacy is a human right</span>
              <span>•</span>
              <a 
                href="https://shakespeare.diy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Vibed with Shakespeare
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
