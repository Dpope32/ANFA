# Design Document

## Overview

The frontend interface will be built as a SvelteKit application with TypeScript, providing a clean and responsive user interface for interacting with the existing stock prediction API. The application will feature real-time updates via WebSocket connections, server-side rendering for optimal performance, type-safe API calls with tRPC, robust form validation with Zod, and a minimal bundle size for fast loading times.

## Architecture

### Technology Stack

- **Framework**: SvelteKit with TypeScript
- **API Layer**: tRPC for type-safe API calls and shared schemas
- **Validation**: Zod for schema validation and form validation
- **Styling**: CSS with Svelte's scoped styling
- **Real-time Communication**: WebSocket API with fallback to HTTP polling
- **Build Tool**: Vite (included with SvelteKit)
- **Package Manager**: npm/pnpm
- **Development Server**: SvelteKit dev server

### Application Structure

```bash
frontend/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── StockForm.svelte
│   │   │   ├── PredictionDisplay.svelte
│   │   │   ├── LoadingSpinner.svelte
│   │   │   └── ErrorMessage.svelte
│   │   ├── trpc/
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   ├── schemas/
│   │   │   ├── prediction.ts
│   │   │   └── form.ts
│   │   ├── services/
│   │   │   └── websocket.ts
│   │   └── utils/
│   │       └── validation.ts
│   ├── routes/
│   │   └── +page.svelte
│   └── app.html
├── static/
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.js
```

## Components and Interfaces

### Core Components

#### 1. StockForm Component

**Purpose**: Input form for stock symbol and expiration date with Zod validation
**Props**: None (manages its own state)
**Events**: `submit` - emits validated form data

```typescript
// Using Zod schema for validation
const formSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z]+$/),
  expirationDate: z.string().refine((date) => new Date(date) > new Date()),
});

type FormData = z.infer<typeof formSchema>;
```

#### 2. PredictionDisplay Component

**Purpose**: Display prediction results in a structured format
**Props**:

- `prediction: PredictionResult | null`
- `loading: boolean`

#### 3. LoadingSpinner Component

**Purpose**: Visual feedback during API requests
**Props**:

- `message?: string`

#### 4. ErrorMessage Component

**Purpose**: Display user-friendly error messages
**Props**:

- `error: string | null`
- `dismissible?: boolean`

### tRPC Integration

#### tRPC Client Setup (`src/lib/trpc/client.ts`)

```typescript
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/trpc/router";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
```

#### tRPC Types (`src/lib/trpc/types.ts`)

```typescript
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../backend/src/trpc/router";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PredictionInput = RouterInputs["prediction"]["predict"];
export type PredictionOutput = RouterOutputs["prediction"]["predict"];
```

## Data Models with Zod Schemas

### Prediction Schemas (`src/lib/schemas/prediction.ts`)

```typescript
import { z } from "zod";

export const predictionResultSchema = z.object({
  symbol: z.string(),
  predictedPrice: z.number().positive(),
  confidence: z.number().min(0).max(1),
  volatility: z.number().min(0),
  timestamp: z.string().datetime(),
  expirationDate: z.string().datetime(),
  metadata: z
    .object({
      processingTime: z.number(),
      modelVersion: z.string(),
    })
    .optional(),
});

export const progressUpdateSchema = z.object({
  stage: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string(),
  timestamp: z.string().datetime(),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export type PredictionResult = z.infer<typeof predictionResultSchema>;
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
```

### Form Schemas (`src/lib/schemas/form.ts`)

```typescript
import { z } from "zod";

export const stockFormSchema = z.object({
  symbol: z
    .string()
    .min(1, "Stock symbol is required")
    .max(10, "Stock symbol must be 10 characters or less")
    .regex(/^[A-Z]+$/, "Stock symbol must contain only uppercase letters")
    .transform((val) => val.toUpperCase()),
  expirationDate: z
    .string()
    .min(1, "Expiration date is required")
    .refine(
      (date) => new Date(date) > new Date(),
      "Expiration date must be in the future"
    ),
});

export type StockFormData = z.infer<typeof stockFormSchema>;

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.object({
    symbol: z.string().optional(),
    expirationDate: z.string().optional(),
  }),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;
```

## Error Handling

### Error Categories

1. **Validation Errors**: Zod schema validation failures
2. **tRPC Errors**: Type-safe API errors from tRPC
3. **Network Errors**: Connection and timeout issues
4. **WebSocket Errors**: Real-time connection issues

### Error Handling Strategy

- Use Zod for client-side validation with detailed error messages
- Leverage tRPC's built-in error handling for API calls
- Provide retry mechanisms for transient failures
- Graceful degradation when WebSocket fails (fallback to polling)

### Error Display Patterns

```typescript
import { TRPCError } from "@trpc/server";

const handleTRPCError = (error: TRPCError) => {
  switch (error.code) {
    case "BAD_REQUEST":
      return "Invalid request. Please check your input.";
    case "INTERNAL_SERVER_ERROR":
      return "Server error occurred. Please try again later.";
    case "TIMEOUT":
      return "Request timed out. Please try again.";
    default:
      return "An unexpected error occurred.";
  }
};
```

## Testing Strategy

### Unit Testing

- Component testing with Vitest and Testing Library
- Zod schema validation testing
- tRPC client testing with mock responses
- Utility function testing

### Integration Testing

- End-to-end testing with Playwright
- tRPC integration testing
- WebSocket connection testing

### Test Structure

```bash
tests/
├── unit/
│   ├── components/
│   ├── schemas/
│   └── utils/
├── integration/
│   └── trpc.test.ts
└── e2e/
    └── prediction-flow.test.ts
```

## Performance Optimizations

### Bundle Size Optimization

- Tree-shaking unused tRPC procedures
- Dynamic imports for non-critical components
- Minimal external dependencies
- Zod schema compilation optimization

### Loading Performance

- Server-side rendering for initial page load
- Progressive enhancement for JavaScript features
- tRPC batching for multiple API calls
- Optimized asset loading

### Runtime Performance

- Reactive updates using Svelte's built-in reactivity
- Efficient WebSocket connection management
- Memoized Zod validation results
- tRPC query caching

## Real-time Communication Design

### WebSocket Implementation

```typescript
class PredictionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  connect(predictionId: string) {
    const wsUrl = `ws://localhost:3000/ws/prediction/${predictionId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const rawData = JSON.parse(event.data);
      // Validate with Zod schema
      const data = progressUpdateSchema.parse(rawData);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.handleReconnect();
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, 1000 * this.reconnectAttempts);
    } else {
      // Fallback to tRPC polling
      this.startTRPCPolling();
    }
  }
}
```

### Fallback Strategy

When WebSocket connection fails:

1. Display notification about degraded functionality
2. Switch to tRPC polling every 2 seconds
3. Provide manual refresh option
4. Attempt WebSocket reconnection on next request

## Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Layout Strategy

- Mobile-first responsive design
- Flexible grid system using CSS Grid
- Touch-friendly interface elements
- Accessible form controls

### Component Responsiveness

```css
.prediction-form {
  display: grid;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .prediction-form {
    padding: 1rem;
    max-width: 100%;
  }
}
```

## Security Considerations

### Input Validation

- Zod schema validation on both client and server
- XSS prevention through proper escaping
- CSRF protection for form submissions
- tRPC's built-in type safety

### API Security

- HTTPS enforcement in production
- tRPC procedure-level authorization
- Proper error message handling (no sensitive data exposure)

## Deployment Strategy

### Build Configuration

```javascript
// svelte.config.js
import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: null,
    }),
    prerender: {
      default: true,
    },
  },
};
```

### Environment Configuration

- Development: Local tRPC endpoint
- Production: Production tRPC endpoint
- Environment-specific WebSocket URLs
- Feature flags for development features

This design provides a robust, type-safe foundation for a performant frontend interface that integrates seamlessly with the existing stock prediction API while leveraging modern tools like tRPC and Zod for enhanced developer experience and runtime safety.
