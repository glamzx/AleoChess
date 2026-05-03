# ♟️ Aleo Chess Royale

> **The chess platform that makes you better.** Play online, challenge AI, solve puzzles, and climb the global leaderboard.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green?logo=supabase)
![Stockfish](https://img.shields.io/badge/Stockfish-WASM-orange)

---

## 🎮 Features

| Feature | Description |
|---------|-------------|
| ⚔️ **Play Online** | Real-time multiplayer via Supabase Realtime channels |
| 🤖 **AI Opponents** | Play against Stockfish WASM at any difficulty level |
| 🧩 **Daily Puzzles** | Sharpen tactics with fresh puzzles every day |
| 🏆 **Ranked Play** | ELO rating system — climb from Bronze to Grandmaster |
| 👥 **Friend Games** | Share a link, your friend joins in seconds |
| 🧠 **AI Coach** | Personalized advice after every game |
| 🛍️ **Cosmetic Store** | 25+ board skins, piece sets, effects & flairs |
| 🌍 **Multilingual** | Russian, Kazakh, English support |
| 💳 **Payments Ready** | Stripe (global) + YooKassa (CIS) infrastructure |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** 18+ → [Download](https://nodejs.org)
- **pnpm** → Install with: `npm install -g pnpm`
- **Supabase account** (free) → [supabase.com](https://supabase.com)

### 1️⃣ Clone the repo

```bash
git clone https://github.com/glamzx/AleoChess.git
cd AleoChess
```

### 2️⃣ Install dependencies

```bash
pnpm install
```

### 3️⃣ Set up environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your Supabase keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

> 💡 **Don't have Supabase keys?** The app works in demo mode without them — you can still play against AI and explore the UI!

### 4️⃣ Download Stockfish WASM engine

```bash
# Download the Stockfish WASM file (required for AI games)
curl -L -o apps/web/public/engine/stockfish-single.wasm \
  "https://github.com/nicfv/Stockfish/releases/download/v2/stockfish.wasm"
```

> ⚠️ The WASM file is ~100MB and excluded from git. AI games won't work without it.

### 5️⃣ Start the dev server

```bash
cd apps/web
pnpm dev
```

### 6️⃣ Open in browser

```
http://localhost:3000
```

🎉 **You're in!** Click "Play as Guest" to start immediately.

---

## 🏗️ Project Structure

```
AleoChess/
├── apps/web/               # Next.js 14 web application
│   ├── src/app/            # App Router pages
│   ├── src/components/     # React components
│   ├── src/lib/            # Business logic & utilities
│   └── public/             # Static assets (mascot, engine)
├── packages/shared/        # Shared TypeScript types
├── infra/supabase/         # Database migrations & edge functions
│   ├── migrations/         # SQL schema files
│   └── functions/          # Supabase Edge Functions
└── engine/Stockfish/       # Stockfish chess engine source
```

---

## 🎯 How to Play

### 🤖 vs AI (works offline!)
1. Click **Play** → **vs Bot**
2. Choose difficulty (1-20)
3. Start playing!

### 👥 vs Friend
1. Click **Play** → **vs Friend**
2. Share the generated link with your friend
3. When they open it, the game starts automatically

### ⚔️ Ranked Match
1. Click **Play** → **Ranked**
2. Wait for matchmaking to find an opponent
3. Win to gain ELO, lose to drop

---

## 🔧 Troubleshooting

### ❌ "Module not found" errors
```bash
pnpm install    # Re-install all dependencies
```

### ❌ AI games don't work / board is empty
The Stockfish WASM file needs to be downloaded separately:
```bash
curl -L -o apps/web/public/engine/stockfish-single.wasm \
  "https://github.com/nicfv/Stockfish/releases/download/v2/stockfish.wasm"
```

### ❌ Supabase connection errors
- Check that `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- The app works in demo mode without Supabase — you can play AI games locally

### ❌ Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9   # Kill the process on port 3000
pnpm dev                          # Restart
```

### ❌ Build fails with TypeScript errors
```bash
cd apps/web
npx next build     # Check the exact error message
```

---

## 🌐 Deployment

### Vercel (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `glamzx/AleoChess`
3. Set **Root Directory** to `apps/web`
4. Add environment variables (Supabase keys)
5. Deploy!

### Environment Variables for Production

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | For server-side operations |
| `STRIPE_SECRET_KEY` | Optional | Stripe payments (add later) |
| `YOOKASSA_SHOP_ID` | Optional | YooKassa payments for CIS |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS + custom design system
- **Database**: Supabase (PostgreSQL + Realtime)
- **Chess Engine**: Stockfish WASM (browser-side)
- **Chess Logic**: chess.js
- **Board UI**: react-chessboard
- **Auth**: Supabase Auth (Google, Email, Guest)
- **Payments**: Stripe + YooKassa (infrastructure ready)
- **i18n**: next-intl (RU/KK/EN)

---

## 📄 Legal

- [Privacy Policy](/legal/privacy)
- [Terms of Service](/legal/terms)

---

## 📬 Contact

**Email**: support@aleochess.com

---

<p align="center">
  <strong>Made with ♟️ by the Aleo Chess team</strong><br/>
  <em>Play smart. Play bold. Play Aleo.</em>
</p>
