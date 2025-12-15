# 🔐 Cypherpunk Quotes Bot

An automated Nostr bot that posts inspirational quotes from cypherpunks, cryptographers, hackers, and digital rights activists. Follow this bot on Nostr to receive a steady stream of thought-provoking wisdom in your feed.

![Cypherpunk Quotes Bot](https://img.shields.io/badge/Nostr-Bot-purple?style=for-the-badge)
![Quotes](https://img.shields.io/badge/Quotes-110+-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## ✨ Features

- **110+ Curated Quotes** from legendary figures in cryptography and digital rights
- **Automated Posting** via GitHub Actions (configurable intervals)
- **Web Dashboard** for browsing, searching, and manually posting quotes
- **Smart Rotation** - avoids repeating recent quotes
- **Multi-Relay Publishing** for maximum reach
- **Clean Attribution** with source and year when available

## 🌟 Featured Voices

The quote database includes wisdom from:

| Cryptographers | Cypherpunks | Activists |
|---------------|-------------|-----------|
| Satoshi Nakamoto | Tim May | Edward Snowden |
| Hal Finney | Eric Hughes | Julian Assange |
| David Chaum | Nick Szabo | Aaron Swartz |
| Whitfield Diffie | Wei Dai | Jacob Appelbaum |
| Ralph Merkle | Adam Back | Ross Ulbricht |
| Bruce Schneier | fiatjaf | Cody Wilson |
| Philip Zimmermann | John Perry Barlow | Richard Stallman |

## 🚀 Quick Start

### Option 1: Web Dashboard

The web dashboard allows you to browse quotes and post manually:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:5173` to access the dashboard.

### Option 2: Automated Bot (GitHub Actions)

1. **Fork this repository**

2. **Generate a Nostr keypair** for your bot:
   ```bash
   npx tsx bot/index.ts
   ```
   This will generate a keypair if none exists. Save the `nsec` securely!

3. **Add the secret** to your repository:
   - Go to Settings → Secrets and variables → Actions
   - Add a new secret named `NOSTR_PRIVATE_KEY`
   - Paste your bot's private key (hex or nsec format)

4. **Enable the workflow**:
   - Go to Actions → Post Quote to Nostr
   - Enable the workflow

The bot will automatically post every 4 hours. You can also trigger posts manually from the Actions tab.

### Option 3: Self-Hosted Bot

Run the bot on your own server:

```bash
# Install dependencies
npm install

# Set environment variables
export NOSTR_PRIVATE_KEY="your-nsec-or-hex-key"
export STATE_FILE="./bot-state.json"

# Run the bot
npx tsx bot/index.ts
```

Set up a cron job to run at your desired interval:

```bash
# Every 4 hours
0 */4 * * * cd /path/to/bot && npx tsx bot/index.ts >> bot.log 2>&1
```

## 📁 Project Structure

```
├── src/
│   ├── data/
│   │   └── quotes.json       # The quote database
│   ├── lib/
│   │   ├── quotes.ts         # Quote utilities
│   │   └── botService.ts     # Bot state management
│   ├── hooks/
│   │   └── usePostQuote.ts   # React hook for posting
│   └── pages/
│       └── Index.tsx         # Web dashboard
├── bot/
│   └── index.ts              # Standalone bot script
└── .github/workflows/
    └── post-quote.yml        # GitHub Actions workflow
```

## 📊 Quote Database Schema

Quotes are stored in `src/data/quotes.json`:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-01T00:00:00Z",
  "quotes": [
    {
      "id": "unique-identifier",
      "text": "The quote text itself",
      "author": "Author Name",
      "source": "Where it was said/written (optional)",
      "year": 2009,
      "tags": ["bitcoin", "privacy", "freedom"]
    }
  ]
}
```

### Adding New Quotes

1. Open `src/data/quotes.json`
2. Add a new entry to the `quotes` array
3. Ensure the `id` is unique (format: `author-slug-001`)
4. Include at least: `id`, `text`, `author`, `tags`
5. Update `lastUpdated` timestamp

## ⚙️ Configuration

### Bot Configuration

Edit `src/lib/botService.ts` to customize:

```typescript
export const DEFAULT_BOT_CONFIG: BotConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://relay.ditto.pub',
  ],
  intervalHours: 4,
  hashtags: ['cypherpunk', 'bitcoin', 'privacy', 'freedom'],
};
```

### GitHub Actions Schedule

Edit `.github/workflows/post-quote.yml`:

```yaml
on:
  schedule:
    # Default: Every 4 hours
    - cron: '0 */4 * * *'
    
    # Every 6 hours
    # - cron: '0 */6 * * *'
    
    # Twice daily (9am and 9pm UTC)
    # - cron: '0 9,21 * * *'
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NOSTR_PRIVATE_KEY` | Bot's private key (hex or nsec) | Yes |
| `RELAYS` | Comma-separated relay URLs | No |
| `STATE_FILE` | Path to state file | No |

## 📝 Example Post Format

```
"Privacy is necessary for an open society in the electronic age."

— Eric Hughes (A Cypherpunk's Manifesto, 1993)

#cypherpunk #bitcoin #privacy #freedom #manifesto
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run test

# Build for production
npm run build
```

## 📜 License

MIT License - Feel free to fork and create your own quote bot!

## 🙏 Credits

- Built with [MKStack](https://gitlab.com/soapbox-pub/mkstack) (React + Nostr)
- Quote sources: Various public domain documents, interviews, and writings
- Inspired by the cypherpunk movement and the ongoing fight for digital freedom

---

<p align="center">
  <i>"Cypherpunks write code."</i> — Eric Hughes
</p>

<p align="center">
  <a href="https://shakespeare.diy">Vibed with Shakespeare</a>
</p>
