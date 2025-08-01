import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  DynamicDomainRadarChart,
  DynamicKSARadarChart,
  DynamicPBLRadarChart,
} from '../dynamic-imports';

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
    it('shows loading state initially', () => {
      render(<DynamicDomainRadarChart />);
      
      const loadingElement = screen.getByRole('generic');
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      render(<DynamicDomainRadarChart />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      }, { timeout: 200 });
      
      expect(screen.getByText('Loaded Component')).toBeInTheDocument();
    });
    
    it('passes props to loaded component', async () => {
      const testProps = { data: 'test' };
      render(<DynamicDomainRadarChart {...testProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('DynamicKSARadarChart', () => {
    it('shows loading state initially', () => {
      render(<DynamicKSARadarChart />);
      
      const loadingElement = screen.getByRole('generic');
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      render(<DynamicKSARadarChart />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('DynamicPBLRadarChart', () => {
    it('shows loading state initially', () => {
      render(<DynamicPBLRadarChart />);
      
      const loadingElement = screen.getByRole('generic');
      expect(loadingElement).toHaveClass('h-64', 'w-full', 'animate-pulse', 'bg-gray-100', 'rounded');
    });
    
    it('loads the component after delay', async () => {
      render(<DynamicPBLRadarChart />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-component')).toBeInTheDocument();
      });
    });
  });
  
  describe('Loading states', () => {
    it('all dynamic imports use consistent loading UI', () => {
      const { container: container1 } = render(<DynamicDomainRadarChart />);
      const { container: container2 } = render(<DynamicKSARadarChart />);
      const { container: container3 } = render(<DynamicPBLRadarChart />);
      
      const loadingDiv1 = container1.querySelector('.animate-pulse');
      const loadingDiv2 = container2.querySelector('.animate-pulse');
      const loadingDiv3 = container3.querySelector('.animate-pulse');
      
      expect(loadingDiv1).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
      expect(loadingDiv2).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
      expect(loadingDiv3).toHaveClass('h-64', 'w-full', 'bg-gray-100', 'rounded');
    });
  });
});
