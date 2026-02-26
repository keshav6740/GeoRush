# GeoRush

GeoRush is a geography game platform built with Next.js.  
It combines fast solo challenges, daily modes, and private 1v1 duels with live maps, leaderboards, profiles, and score tracking.

## Highlights

- Multiple geography game modes in one app
- Real-time style gameplay loops with scoring and feedback
- Global leaderboard + personal profile stats
- Guest + local + Google-linked account flows
- Shareable duel rooms (invite links)
- Mobile-optimized layouts across key pages

## Game Modes

- `Speed Run`: name as many countries as possible in 60 seconds
- `World Quiz`: full-country map marathon (timed)
- `Continent Quiz`: region-specific country quiz
- `Daily Challenge`: seeded daily puzzle
- `Capital Guess`:  
  - Country -> Capital  
  - Capital -> Country
- `Travel Chain`: connect start/end countries through guessed route logic
- `Flag Guess`: guess country from displayed flag (with Reveal & Skip)
- `1v1 Duel`: private room, ready-up, synced competitive rounds

## UI/UX

- Bright arcade-style visual design (gradients, glass cards, soft neon accents)
- Ocean-blue map background for land/water clarity
- Zoom/pan map interaction where relevant
- Responsive behavior tuned for phone + desktop

## Tech Stack

- Next.js 16 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide icons

## Project Structure

- `app/` - routes, pages, and API handlers
- `components/` - reusable UI/game/result components
- `lib/` - game logic, scoring, country utilities, identity helpers
- `data/` - local JSON data stores
- `public/` - static assets

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3) Production build

```bash
npm run build
npm run start
```

## Environment

Create `.env.local` for auth and duel room features.

Required for duel rooms:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional fallback keys (if you are using permissive RLS policies):

```env
SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Optional auth key:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

After setting env vars, run `supabase/duel_rooms.sql` in your Supabase SQL editor so the `duel_rooms` table and policies exist.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - lint project

## Deployment

This project is configured to deploy cleanly on Vercel from `main`.  
Pushing to GitHub triggers auto-redeploy when connected in Vercel.

## Notes

- Build currently passes successfully on the latest pushed state.
- Some gameplay/profile data is backed by local JSON and in-app APIs.
