# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
yarn dev     # Start Next.js dev server (port 3000)
yarn build   # Build for production
yarn start   # Start production server
yarn lint    # Run ESLint
```

## Architecture

**Ithbat** is an Islamic knowledge research application built with Next.js 15 (App Router).

### Project Structure

```
app/
├── layout.tsx          # Root layout with providers
├── page.tsx            # Main search page
└── api/
    └── research/
        └── route.ts    # SSE streaming research endpoint

lib/
├── ai-config.ts        # AI model configuration (tiers)
├── openrouter.ts       # OpenRouter API client
├── prompts.ts          # Islamic research prompts
└── api.ts              # Frontend SSE client

components/
├── research/           # Research UI components
│   ├── SearchInput.tsx
│   ├── ResearchStep.tsx
│   └── ResearchContainer.tsx
├── theme-switch.tsx    # Dark mode toggle
└── icons.tsx           # SVG icons

context/
└── ResearchContext.tsx # Research state management

types/
├── research.ts         # Research types
└── sources.ts          # Islamic source types
```

### API Route

`POST /api/research` - Streams SSE events for the research pipeline:
1. Understanding (QUICK model) - Parse question
2. Searching (REASONING model) - Find Islamic sources
3. Synthesizing (HIGH model) - Build final answer

### Model Tiers (lib/ai-config.ts)

Configure AI models in `lib/ai-config.ts`. Currently using Gemini 2.5 Flash.

### Environment Variables

Create `.env.local`:
```
OPENROUTER_API_KEY=your_key_here
```

## Key Patterns

- App Router with `"use client"` for interactive components
- HeroUI components imported individually
- next-themes for dark mode
- Framer Motion for animations
- SSE streaming for real-time AI responses



DONT START THE PROGRAM YOURSELF, THE USER WILL RUN IT HIMSELF