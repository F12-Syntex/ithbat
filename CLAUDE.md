# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
yarn dev      # Start development server
yarn build    # Type-check and build for production
yarn lint     # Run ESLint with auto-fix
yarn preview  # Preview production build
```

## Architecture

This is a Vite + React + TypeScript application using HeroUI v2 component library.

**Provider Stack** (src/main.tsx):
`BrowserRouter` → `Provider` (HeroUIProvider with router integration) → `App`

**Routing**: React Router v6 in src/App.tsx. Pages are in src/pages/.

**Layout System**: src/layouts/default.tsx provides the standard page layout with navbar and footer. Pages should use this layout wrapper.

**Site Configuration**: src/config/site.ts contains navigation items and external links. Update this file when adding new routes to the navbar.

**Path Alias**: `@/*` maps to `src/*`

## Key Patterns

- HeroUI components are imported individually (e.g., `@heroui/button`, `@heroui/input`)
- Tailwind Variants (`tailwind-variants`) is used for component styling variants in src/components/primitives.ts
- Dark mode is class-based (`darkMode: "class"` in tailwind.config.js)
- Framer Motion is available for animations