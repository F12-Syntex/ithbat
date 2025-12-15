# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
yarn dev     # Start unified dev server (Express + Vite on port 3000)
yarn build   # Type-check and build for production
yarn lint    # Run ESLint with auto-fix
```

## Architecture

**Ithbat** is an Islamic knowledge research application with a secure backend that handles AI API calls.

### Unified Dev Server (server/dev.ts)

Single entry point that runs Express with Vite as middleware - everything runs on port 3000 with one command.

### Backend (server/)

Express server that proxies OpenRouter API calls to keep the API key secure:

- `server/dev.ts` - Unified dev server (Express + Vite middleware + WebSocket HMR)
- `server/config/ai.ts` - AI model configuration (tiers, trusted domains)
- `server/routes/research.ts` - SSE streaming endpoint (`POST /api/research`)
- `server/services/openrouter.ts` - OpenRouter API client with streaming
- `server/services/prompts.ts` - Islamic research system prompts

**Model Tiers:**
- QUICK: `anthropic/claude-3.5-haiku` - Fast question understanding
- HIGH: `anthropic/claude-3.5-sonnet` - Quality synthesis
- REASONING: `perplexity/sonar-reasoning` - Deep research with web search

### Frontend (src/)

Vite + React + TypeScript with HeroUI v2 components.

**Provider Stack** (src/main.tsx):
`BrowserRouter` → `Provider` (HeroUIProvider + ResearchProvider) → `App`

**Research Flow:**
1. User submits query via `SearchInput`
2. Frontend calls `/api/research` endpoint
3. Backend streams SSE events through research pipeline:
   - Understanding (QUICK model)
   - Searching (REASONING model with web search)
   - Synthesizing (HIGH model)
4. `ResearchContext` manages state, `ResearchStep` components render streaming content

**Key Files:**
- `src/context/ResearchContext.tsx` - Research state management with useReducer
- `src/services/api.ts` - SSE client for streaming responses
- `src/components/research/` - UI components (SearchInput, ResearchStep, ResearchContainer)

### Configuration

- **Path Alias**: `@/*` maps to `src/*`
- **Environment**: `OPENROUTER_API_KEY` in `.env.local` (server-side only, no VITE_ prefix)

## Key Patterns

- HeroUI components imported individually (`@heroui/button`, `@heroui/card`, etc.)
- Dark mode is class-based (`darkMode: "class"`)
- Framer Motion for animations
- SSE (Server-Sent Events) for streaming AI responses
