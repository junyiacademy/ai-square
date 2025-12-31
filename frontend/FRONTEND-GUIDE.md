# Frontend CLAUDE.md - AI Square

Frontend-specific development guidelines for Claude Code.

## 🎯 Technology Stack

- **Framework**: Next.js 15.1.0 (App Router)
- **TypeScript**: 5.3.3 (Strict mode)
- **State Management**: Zustand 4.4.7 (client), TanStack Query 5.17.9 (server)
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui + Radix UI
- **Testing**: Jest + React Testing Library + Playwright
- **Linting**: ESLint (Next.js config + TypeScript strict)

## 🚨 TypeScript Strict Rules

### Zero Tolerance Policies

1. **No `any` types** - EVER

   ```typescript
   // ❌ WRONG
   const data: any = fetchData();

   // ✅ CORRECT
   const data: Record<string, unknown> = fetchData();
   // OR with specific type
   const data: UserData = fetchData();
   ```

2. **No `@ts-ignore` or `@ts-expect-error`**
   - Fix the root cause, don't suppress
   - If truly necessary, create a typed wrapper

3. **Next.js 15 Route Params Must Be Awaited**

   ```typescript
   // ❌ WRONG
   export default function Page({ params }: { params: { id: string } }) {
     // ...
   }

   // ✅ CORRECT
   export default async function Page(props: {
     params: Promise<{ id: string }>;
   }) {
     const params = await props.params;
     // ...
   }
   ```

4. **Multilingual Fields Format**

   ```typescript
   // ❌ WRONG
   title: string;

   // ✅ CORRECT
   title: Record<string, string>;
   description: Record<string, string>;

   // Usage
   const program = {
     title: { en: "Math Program", zh: "數學課程" },
   };
   ```

5. **Repository Optional Methods**

   ```typescript
   // ❌ WRONG
   const program = await repository.getById(id);

   // ✅ CORRECT
   const program = await repository?.getById?.(id);
   ```

## 📏 Code Style Guidelines

### Import Organization

```typescript
// 1. React/Next.js
import { useState } from "react";
import { notFound } from "next/navigation";

// 2. External libraries
import { z } from "zod";

// 3. Internal aliases (@/)
import { Button } from "@/components/ui/button";
import { createProgramRepository } from "@/lib/db/program-repository";

// 4. Types
import type { Program, Scenario } from "@/types";

// 5. Relative imports
import { helper } from "./helper";
```

### Component Structure

```typescript
// 1. Type definitions
type ComponentProps = {
  title: string;
  onAction: () => void;
};

// 2. Component
export function Component({ title, onAction }: ComponentProps) {
  // 3. Hooks (useState, useEffect, etc.)
  const [state, setState] = useState<string>('');

  // 4. Event handlers
  const handleClick = () => {
    // ...
  };

  // 5. Render helpers
  const renderContent = () => {
    // ...
  };

  // 6. Return JSX
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}

// Hooks: use prefix
export function useAuth() {}

// Utilities: camelCase
export function formatDate() {}

// Constants: UPPER_SNAKE_CASE
export const API_BASE_URL = '...';

// Types/Interfaces: PascalCase
export type UserData = {...};
export interface ApiResponse {...}

// API Routes: kebab-case (file names)
// app/api/user-programs/route.ts
```

## 🧪 Testing Requirements

### Test Coverage Minimum: 70%

**Test Priority (must have tests):**

1. API routes (`app/api/**/route.ts`)
2. Repository functions (`lib/db/*-repository.ts`)
3. Utility functions (`lib/utils/*.ts`)
4. React hooks (`hooks/*.ts`)
5. Critical user flows (E2E with Playwright)

### API Route Testing Pattern

```typescript
// __tests__/api/programs.test.ts
import { GET } from "@/app/api/programs/route";

describe("GET /api/programs", () => {
  it("returns programs list", async () => {
    const request = new Request("http://localhost:3000/api/programs");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### Component Testing Pattern

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Testing Pattern

```typescript
// e2e/program-flow.spec.ts
import { test, expect } from "@playwright/test";

test("user can create and view program", async ({ page }) => {
  await page.goto("/programs");
  await page.click("text=Create Program");
  await page.fill('input[name="title"]', "Test Program");
  await page.click('button[type="submit"]');

  await expect(page.locator("text=Test Program")).toBeVisible();
});
```

## 🎨 UI Development Workflow

### Visual Iteration Process

1. **Design Reference** - Screenshot/Figma export
2. **Initial Implementation** - Build component
3. **Screenshot Comparison** - Take screenshot of implementation
4. **Iterate** - Adjust until pixel-perfect match
5. **Playwright Visual Test** - Add visual regression test

### Responsive Design Requirements

```typescript
// Must test on all breakpoints
const breakpoints = {
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
};

// Use Tailwind responsive utilities
<div className="w-full sm:w-1/2 lg:w-1/3">
```

## 🔄 State Management Patterns

### Client State (Zustand)

```typescript
// stores/useAuthStore.ts
import { create } from "zustand";

type AuthState = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### Server State (TanStack Query)

```typescript
// hooks/usePrograms.ts
import { useQuery } from "@tanstack/react-query";

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const res = await fetch("/api/programs");
      if (!res.ok) throw new Error("Failed to fetch programs");
      return res.json() as Promise<Program[]>;
    },
  });
}
```

## 🚀 Performance Optimization

### Code Splitting

```typescript
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  ssr: false,
  loading: () => <Skeleton />,
});
```

### Image Optimization

```typescript
import Image from 'next/image';

// Always use Next.js Image component
<Image
  src="/hero.png"
  alt="Hero"
  width={1200}
  height={600}
  priority // For above-fold images
/>
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

## 📦 Common Patterns

### Error Handling

```typescript
// API route error handling
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return Response.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Loading States

```typescript
// app/programs/page.tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProgramsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ProgramsList />
    </Suspense>
  );
}
```

### Form Validation (Zod)

```typescript
import { z } from "zod";

const programSchema = z.object({
  title: z.record(z.string()),
  description: z.record(z.string()),
  scenarioId: z.string().uuid(),
});

type ProgramInput = z.infer<typeof programSchema>;
```

## 🐛 Debugging Tools

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Testing
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npx playwright test --headed  # E2E with browser

# Build check
npm run build
```

## 🔗 Related Documentation

- Architecture: `/docs/technical/infrastructure/unified-learning-architecture.md`
- API Design: See architecture doc for Repository Pattern details
- Deployment: `/docs/deployment/CICD.md`

---

**Version**: 1.0 (2025-01-27)
