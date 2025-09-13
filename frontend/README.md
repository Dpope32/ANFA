# Stock Prediction Frontend

A SvelteKit frontend application for the stock prediction system.

## Project Structure

```bash
src/
├── lib/
│   ├── components/     # Svelte components
│   ├── trpc/          # tRPC client configuration
│   ├── schemas/       # Zod validation schemas
│   ├── services/      # Service layer (WebSocket, etc.)
│   └── utils/         # Utility functions
├── routes/            # SvelteKit routes
├── app.html          # HTML template
└── app.d.ts          # TypeScript declarations
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Technologies

- SvelteKit with TypeScript
- tRPC for type-safe API calls
- Zod for schema validation
- Vite for build tooling
