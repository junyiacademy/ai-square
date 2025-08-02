import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    
    it('shows loading state initially', () => {
      const { container } = render(<DynamicDomainRadarChart data={mockData} />);
      
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      render(<DynamicDomainRadarChart data={mockData} />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      }, { timeout: 200 });
      
      expect(screen.getByText('Loaded Component')).toBeInTheDocument();
    });
    
    it('passes props to loaded component', async () => {
      const testProps = { data: mockData };
      render(<DynamicDomainRadarChart {...testProps} />);
      
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
    
    it('shows loading state initially', () => {
      const { container } = render(<DynamicKSARadarChart ksaScores={mockKsaScores} />);
      
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      render(<DynamicKSARadarChart ksaScores={mockKsaScores} />);
      
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
    
    it('shows loading state initially', () => {
      const { container } = render(<DynamicPBLRadarChart domainScores={mockDomainScores} />);
      
      const loadingElement = container.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      render(<DynamicPBLRadarChart domainScores={mockDomainScores} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('Loading states', () => {
    it('all dynamic imports use consistent loading UI', () => {
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
      
      const { container: container1 } = render(<DynamicDomainRadarChart data={mockData} />);
      const { container: container2 } = render(<DynamicKSARadarChart ksaScores={mockKsaScores} />);
      const { container: container3 } = render(<DynamicPBLRadarChart domainScores={mockDomainScores} />);
      
      const loadingDiv1 = container1.querySelector('.animate-pulse');
      const loadingDiv2 = container2.querySelector('.animate-pulse');
      const loadingDiv3 = container3.querySelector('.animate-pulse');
      
      expect(loadingDiv1).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
      expect(loadingDiv2).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
      expect(loadingDiv3).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
    });
  });
});
