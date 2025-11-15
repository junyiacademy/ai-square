'use client'

import { useRTL } from '@/hooks/useRTL'

export function RTLProvider({ children }: { children: React.ReactNode }) {
  useRTL(); // This hook handles all RTL logic

  return <>{children}</>;
}
