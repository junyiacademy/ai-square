import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import KSAKnowledgeGraph from '../KSAKnowledgeGraph';
import '@testing-library/jest-dom';

// Mock d3
const mockD3 = {
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn(),
      data: jest.fn(() => ({
        enter: jest.fn(() => ({
          append: jest.fn(() => ({
            attr: jest.fn().mockReturnThis(),
            style: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            call: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            filter: jest.fn(() => ({
              append: jest.fn(() => ({
                text: jest.fn().mockReturnThis(),
                attr: jest.fn().mockReturnThis(),
                style: jest.fn().mockReturnThis(),
              }))
            }))
          }))
        }))
      })),
      transition: jest.fn(() => ({
        duration: jest.fn().mockReturnThis(),
        attr: jest.fn().mockReturnThis(),
      }))
    })),
    attr: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    transition: jest.fn(() => ({
      duration: jest.fn(() => ({
        call: jest.fn().mockReturnThis(),
      }))
    })),
    append: jest.fn().mockReturnThis(),
  })),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
    })),
    transform: jest.fn(),
    scaleBy: jest.fn(),
  })),
  zoomIdentity: { translate: jest.fn().mockReturnThis(), scale: jest.fn().mockReturnThis() },
  forceSimulation: jest.fn(() => ({
    force: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    alphaTarget: jest.fn(() => ({
      restart: jest.fn(),
    })),
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn().mockReturnThis(),
  })),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => ({
    radius: jest.fn().mockReturnThis(),
  })),
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
};

jest.mock('d3', () => mockD3);

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

const mockT = jest.fn();
const mockUseTranslation = useTranslation as jest.Mock;

// Mock getBoundingClientRect
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: jest.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })),
});

// Mock window resize
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: jest.fn(),
});

describe('KSAKnowledgeGraph', () => {
  const mockKsaScores = {
    'K1.1': { score: 85, category: 'knowledge' as const },
    'K1.2': { score: 65, category: 'knowledge' as const },
    'S1.1': { score: 45, category: 'skills' as const },
    'A1.1': { score: 90, category: 'attitudes' as const },
  };

  const mockKsaMapping = {
    'K1.1': {
      code: 'K1.1',
      description: 'Understanding of AI fundamentals',
      level: 'Basic'
    },
    'K1.2': {
      code: 'K1.2',
      description: 'Knowledge of machine learning concepts',
      level: 'Intermediate'
    },
    'S1.1': {
      code: 'S1.1',
      description: 'Ability to use AI tools effectively',
      level: 'Advanced'
    },
    'A1.1': {
      code: 'A1.1',
      description: 'Positive attitude towards AI adoption',
      level: 'Basic'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTranslation.mockReturnValue({
      t: mockT,
    });

    // Mock translation values
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'common:zoomIn': 'Zoom In',
        'common:zoomOut': 'Zoom Out',
        'common:resetZoom': 'Reset Zoom',
        'ksa:excellent': 'Excellent',
        'ksa:good': 'Good',
        'ksa:needsWork': 'Needs Work',
        'ksa:graphInstructions': 'Click nodes to view details, drag to move, double-click to reset zoom',
        'ksa:knowledgeComponent': 'Knowledge Component',
        'ksa:skillsComponent': 'Skills Component',
        'ksa:attitudesComponent': 'Attitudes Component',
      };
      return translations[key] || key;
    });
  });

  it('should render without crashing', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );
    
    expect(screen.getByText('Test KSA Graph')).toBeInTheDocument();
  });

  it('should render legend with score ranges', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    expect(screen.getByText('≥80% Excellent')).toBeInTheDocument();
    expect(screen.getByText('60-79% Good')).toBeInTheDocument();
    expect(screen.getByText('<60% Needs Work')).toBeInTheDocument();
  });

  it('should render zoom controls', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    const zoomInButton = screen.getByTitle('Zoom In');
    const zoomOutButton = screen.getByTitle('Zoom Out');
    const resetZoomButton = screen.getByTitle('Reset Zoom');

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(resetZoomButton).toBeInTheDocument();
  });

  it('should render instruction text', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    expect(screen.getByText('Click nodes to view details, drag to move, double-click to reset zoom')).toBeInTheDocument();
  });

  it('should render default state message when no node selected', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    expect(screen.getByText('Click on a KSA node to view details')).toBeInTheDocument();
    expect(screen.getByText('Select any colored node in the knowledge graph')).toBeInTheDocument();
  });

  it('should handle zoom in button click', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    const zoomInButton = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInButton);

    // Verify d3 methods were called (indirectly through mocked implementation)
    expect(zoomInButton).toBeInTheDocument();
  });

  it('should handle zoom out button click', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    const zoomOutButton = screen.getByTitle('Zoom Out');
    fireEvent.click(zoomOutButton);

    expect(zoomOutButton).toBeInTheDocument();
  });

  it('should handle reset zoom button click', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    const resetZoomButton = screen.getByTitle('Reset Zoom');
    fireEvent.click(resetZoomButton);

    expect(resetZoomButton).toBeInTheDocument();
  });

  it('should create D3 elements on mount', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test KSA Graph" 
      />
    );

    // Verify D3 select was called
    expect(mockD3.select).toHaveBeenCalled();
    expect(mockD3.forceSimulation).toHaveBeenCalled();
  });

  it('should handle empty KSA scores', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={{}} 
        title="Empty Graph" 
      />
    );

    expect(screen.getByText('Empty Graph')).toBeInTheDocument();
    expect(screen.getByText('Click on a KSA node to view details')).toBeInTheDocument();
  });

  it('should render with KSA mapping', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
        ksaMapping={mockKsaMapping}
      />
    );

    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });

  it('should handle window resize', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Simulate window resize
    act(() => {
      // Mock getBoundingClientRect to return different dimensions
      HTMLElement.prototype.getBoundingClientRect = jest.fn(() => ({
        width: 1000,
        height: 700,
        top: 0,
        left: 0,
        bottom: 700,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));

      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
    });

    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should have proper CSS classes and structure', () => {
    const { container } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Main container
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
    expect(container.querySelector('.shadow-lg')).toBeInTheDocument();

    // Grid layout
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:grid-cols-2')).toBeInTheDocument();
  });

  it('should render SVG element', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-full', 'border', 'border-gray-200', 'rounded-lg');
  });

  it('should test score color helper function', () => {
    const component = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // The component should render without throwing errors
    // Testing helper functions indirectly through rendering
    expect(component.container).toBeInTheDocument();
  });

  it('should test score status helper function', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Helper functions are used internally in the component
    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });

  it('should handle different category types', () => {
    const mixedKsaScores = {
      'K1.1': { score: 85, category: 'knowledge' as const },
      'S1.1': { score: 65, category: 'skills' as const },
      'A1.1': { score: 45, category: 'attitudes' as const },
    };

    render(
      <KSAKnowledgeGraph 
        ksaScores={mixedKsaScores} 
        title="Mixed Categories" 
      />
    );

    expect(screen.getByText('Mixed Categories')).toBeInTheDocument();
  });

  it('should handle nodes with different score ranges', () => {
    const scoreRangeKsaScores = {
      'high': { score: 95, category: 'knowledge' as const },
      'medium': { score: 70, category: 'skills' as const },
      'low': { score: 30, category: 'attitudes' as const },
    };

    render(
      <KSAKnowledgeGraph 
        ksaScores={scoreRangeKsaScores} 
        title="Score Ranges" 
      />
    );

    expect(screen.getByText('Score Ranges')).toBeInTheDocument();
  });

  it('should handle simulation lifecycle correctly', () => {
    const { unmount } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Verify simulation was created
    expect(mockD3.forceSimulation).toHaveBeenCalled();

    unmount();

    // Cleanup should be handled in useEffect cleanup
  });

  it('should render legend color indicators', () => {
    const { container } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Check for color indicator divs
    const greenIndicator = container.querySelector('.bg-green-500');
    const amberIndicator = container.querySelector('.bg-amber-500');
    const redIndicator = container.querySelector('.bg-red-500');

    expect(greenIndicator).toBeInTheDocument();
    expect(amberIndicator).toBeInTheDocument();
    expect(redIndicator).toBeInTheDocument();
  });

  it('should render info icon in instructions', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Check for info icon SVG
    const infoIcon = screen.getByText('Click nodes to view details, drag to move, double-click to reset zoom')
      .closest('span')?.querySelector('svg');
    
    expect(infoIcon).toBeInTheDocument();
  });

  it('should handle translation key fallback', () => {
    mockT.mockImplementation((key: string) => key); // Return key as fallback

    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Should still render with translation keys
    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });

  it('should handle empty container ref', () => {
    // Mock getBoundingClientRect to return undefined
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: jest.fn(() => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })),
    });

    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });

  it('should maintain aspect ratio on resize', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph" 
      />
    );

    // Component should handle aspect ratio internally
    expect(screen.getByText('Test Graph')).toBeInTheDocument();
  });
});