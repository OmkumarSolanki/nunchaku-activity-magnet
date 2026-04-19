# Activity Magnets

A real-time avatar magnet pool where users create profiles with AI-generated avatars and join a shared interactive pool.

## Features

- AI-powered avatar generation
- Real-time magnet pool with interactive avatar bubbles
- Profile creation and persistence via localStorage
- Backend powered by Upstash Redis for shared state
- Dark/light theme toggle

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **Database:** Upstash Redis
- **Icons:** Lucide React
- **Language:** TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with:

```
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

## Deployment

Deployed on [Vercel](https://vercel.com). Every push to `main` triggers auto-deploy.
