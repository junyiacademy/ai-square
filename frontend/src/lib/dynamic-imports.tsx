/**
 * Dynamic imports for code splitting and lazy loading
 */

import dynamic from 'next/dynamic';

// Chart components with loading states
export const DynamicDomainRadarChart = dynamic(
  () => import('@/components/assessment/DomainRadarChart'),
  {
    loading: () => <div className="h-64 w-full animate-pulse bg-gray-100 rounded" />,
    ssr: false
  }
);

export const DynamicKSARadarChart = dynamic(
  () => import('@/components/pbl/KSARadarChart'),
  {
    loading: () => <div className="h-64 w-full animate-pulse bg-gray-100 rounded" />,
    ssr: false
  }
);

export const DynamicPBLRadarChart = dynamic(
  () => import('@/components/pbl/DomainRadarChart'),
  {
    loading: () => <div className="h-64 w-full animate-pulse bg-gray-100 rounded" />,
    ssr: false
  }
);
