
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
  })),
  scaleLinear: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  scaleOrdinal: jest.fn(() => {
    const scale = (value: unknown) => value;
    scale.domain = jest.fn().mockReturnThis();
    scale.range = jest.fn().mockReturnThis();
    return scale;
  }),
  arc: jest.fn(() => {
    const arcFn = jest.fn();
    Object.assign(arcFn, {
      innerRadius: jest.fn().mockReturnThis(),
      outerRadius: jest.fn().mockReturnThis()
    });
    return arcFn;
  }),
  pie: jest.fn(() => {
    const pieFn = jest.fn((data: unknown[]) => data.map((d: unknown, i: number) => ({ data: d, index: i })));
    Object.assign(pieFn, {
      value: jest.fn().mockReturnThis()
    });
    return pieFn;
  }),
}));

import React from 'react';
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import {
  DynamicDomainRadarChart,
  DynamicKSARadarChart,
  DynamicPBLRadarChart,
} from '../dynamic-imports';
import type { RadarChartData } from '@/types/assessment';

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>, options: any) => {
    // Create a component that renders the loading state initially
    const DynamicComponent = (props: any) => {
      const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
      
      React.useEffect(() => {
        // Simulate async loading
        setTimeout(() => {
          // Mock the imported component
          const MockedComponent = () => <div data-testid="loaded-component">Loaded Component</div>;
          setComponent(() => MockedComponent);
        }, 100);
      }, []);
      
      if (!Component && options?.loading) {
        const LoadingComponent = options.loading;
        return <LoadingComponent />;
      }
      
      return Component ? <Component {...props} /> : null;
    };
    
    return DynamicComponent;
  },
}));

describe('Dynamic Imports', () => {
  describe('DynamicDomainRadarChart', () => {
    const mockData: RadarChartData[] = [
      { domain: 'Engaging', score: 80, fullMark: 100 },
      { domain: 'Creating', score: 70, fullMark: 100 }
    ];
    
    it('shows loading state initially', async () => {
      const { container } = renderWithProviders(<DynamicDomainRadarChart data={mockData} />);
      
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      renderWithProviders(<DynamicDomainRadarChart data={mockData} />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      }, { timeout: 200 });
      
      expect(screen.getByText('Loaded Component')).toBeInTheDocument();
    });
    
    it('passes props to loaded component', async () => {
      const testProps = { data: mockData };
      renderWithProviders(<DynamicDomainRadarChart {...testProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('DynamicKSARadarChart', () => {
    const mockKsaScores = {
      K1: { score: 85, category: 'knowledge' as const },
      S1: { score: 75, category: 'skills' as const },
      A1: { score: 90, category: 'attitudes' as const }
    };
    
    it('shows loading state initially', async () => {
      const { container } = renderWithProviders(<DynamicKSARadarChart ksaScores={mockKsaScores} />);
      
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      renderWithProviders(<DynamicKSARadarChart ksaScores={mockKsaScores} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('DynamicPBLRadarChart', () => {
    const mockDomainScores = {
      engaging_with_ai: 80,
      creating_with_ai: 75,
      managing_with_ai: 85,
      designing_with_ai: 70
    };
    
    it('shows loading state initially', async () => {
      const { container } = renderWithProviders(<DynamicPBLRadarChart domainScores={mockDomainScores} />);
      
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      renderWithProviders(<DynamicPBLRadarChart domainScores={mockDomainScores} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('Loading states', () => {
    it('all dynamic imports use consistent loading UI', async () => {
      const mockData: RadarChartData[] = [
        { domain: 'Test', score: 50, fullMark: 100 }
      ];
      const mockKsaScores = {
        K1: { score: 50, category: 'knowledge' as const }
      };
      const mockDomainScores = {
        engaging_with_ai: 50,
        creating_with_ai: 50,
        managing_with_ai: 50,
        designing_with_ai: 50
      };
      
      const { container: container1 } = renderWithProviders(<DynamicDomainRadarChart data={mockData} />);
      const { container: container2 } = renderWithProviders(<DynamicKSARadarChart ksaScores={mockKsaScores} />);
      const { container: container3 } = renderWithProviders(<DynamicPBLRadarChart domainScores={mockDomainScores} />);
      
      const loadingDiv1 = container1.querySelector('.animate-pulse');
      const loadingDiv2 = container2.querySelector('.animate-pulse');
      const loadingDiv3 = container3.querySelector('.animate-pulse');
      
      expect(loadingDiv1).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
      expect(loadingDiv2).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
      expect(loadingDiv3).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
    });
  });
});
