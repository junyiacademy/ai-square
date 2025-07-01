import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KSAKnowledgeGraph from '../KSAKnowledgeGraph';
import * as d3 from 'd3';

// Mock D3
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn()
    })),
    attr: jest.fn(() => ({
      attr: jest.fn(() => ({
        attr: jest.fn()
      }))
    })),
    append: jest.fn(() => ({
      selectAll: jest.fn(() => ({
        data: jest.fn(() => ({
          enter: jest.fn(() => ({
            append: jest.fn(() => ({
              attr: jest.fn(() => ({
                attr: jest.fn(() => ({
                  attr: jest.fn(() => ({
                    attr: jest.fn()
                  }))
                }))
              })),
              style: jest.fn(),
              on: jest.fn(),
              call: jest.fn()
            }))
          }))
        }))
      })),
      append: jest.fn()
    })),
    call: jest.fn(),
    on: jest.fn(),
    transition: jest.fn(() => ({
      duration: jest.fn(() => ({
        call: jest.fn()
      })),
      call: jest.fn()
    }))
  })),
  forceSimulation: jest.fn(() => ({
    force: jest.fn(() => ({
      force: jest.fn(() => ({
        force: jest.fn(() => ({
          force: jest.fn(),
          on: jest.fn(),
          stop: jest.fn(),
          alphaTarget: jest.fn(() => ({
            restart: jest.fn()
          }))
        }))
      }))
    })),
    on: jest.fn(),
    stop: jest.fn()
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn(() => ({
      distance: jest.fn()
    }))
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn()
  })),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => ({
    radius: jest.fn()
  })),
  drag: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn()
      }))
    }))
  })),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn(() => ({
      on: jest.fn()
    })),
    transform: jest.fn(),
    scaleBy: jest.fn()
  })),
  zoomIdentity: {
    translate: jest.fn(() => ({
      scale: jest.fn()
    }))
  }
}));

describe('KSAKnowledgeGraph', () => {
  const mockKsaScores = {
    'K1': { score: 85, category: 'knowledge' as const },
    'K2': { score: 70, category: 'knowledge' as const },
    'S1': { score: 60, category: 'skills' as const },
    'S2': { score: 45, category: 'skills' as const },
    'A1': { score: 90, category: 'attitudes' as const },
    'A2': { score: 75, category: 'attitudes' as const }
  };

  const mockKsaMapping = {
    'K1': {
      code: 'K1',
      description: 'Understanding AI concepts and terminology',
      level: 'Advanced'
    },
    'K2': {
      code: 'K2',
      description: 'Knowledge of AI applications',
      level: 'Intermediate'
    },
    'S1': {
      code: 'S1',
      description: 'Ability to use AI tools effectively',
      level: 'Intermediate'
    },
    'S2': {
      code: 'S2',
      description: 'Problem-solving with AI',
      level: 'Basic'
    },
    'A1': {
      code: 'A1',
      description: 'Ethical consideration in AI use',
      level: 'Advanced'
    },
    'A2': {
      code: 'A2',
      description: 'Collaborative attitude with AI',
      level: 'Intermediate'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
  });

  it('renders without crashing', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="KSA Performance Graph"
      />
    );
    
    expect(screen.getByText('KSA Performance Graph')).toBeInTheDocument();
  });

  it('displays the title correctly', () => {
    const title = 'AI Competency Network';
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title={title}
      />
    );
    
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('renders zoom control buttons', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Reset zoom')).toBeInTheDocument();
  });

  it('displays the legend with score ranges', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    expect(screen.getByText('≥80% Excellent')).toBeInTheDocument();
    expect(screen.getByText('60-79% Good')).toBeInTheDocument();
    expect(screen.getByText('<60% Needs Work')).toBeInTheDocument();
  });

  it('shows instruction text', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    expect(screen.getByText(/Click nodes to see details/)).toBeInTheDocument();
  });

  it('displays placeholder when no node is selected', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    expect(screen.getByText('Click on a KSA node to view details')).toBeInTheDocument();
    expect(screen.getByText('Select any colored node in the knowledge graph')).toBeInTheDocument();
  });

  it('handles zoom in button click', () => {
    const mockCall = jest.fn();
    const mockScaleBy = jest.fn();
    
    (d3.select as jest.Mock).mockReturnValue({
      selectAll: jest.fn(() => ({ remove: jest.fn() })),
      attr: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      call: mockCall,
      on: jest.fn(),
      transition: jest.fn(() => ({
        call: mockCall
      }))
    });

    (d3.zoom as jest.Mock).mockReturnValue({
      scaleExtent: jest.fn().mockReturnThis(),
      on: jest.fn(),
      scaleBy: mockScaleBy
    });

    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    const zoomInButton = screen.getByTitle('Zoom in');
    fireEvent.click(zoomInButton);
    
    expect(mockCall).toHaveBeenCalled();
  });

  it('handles zoom out button click', () => {
    const mockCall = jest.fn();
    
    (d3.select as jest.Mock).mockReturnValue({
      selectAll: jest.fn(() => ({ remove: jest.fn() })),
      attr: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      call: mockCall,
      on: jest.fn(),
      transition: jest.fn(() => ({
        call: mockCall
      }))
    });

    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    const zoomOutButton = screen.getByTitle('Zoom out');
    fireEvent.click(zoomOutButton);
    
    expect(mockCall).toHaveBeenCalled();
  });

  it('handles reset zoom button click', () => {
    const mockCall = jest.fn();
    
    (d3.select as jest.Mock).mockReturnValue({
      selectAll: jest.fn(() => ({ remove: jest.fn() })),
      attr: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      call: mockCall,
      on: jest.fn(),
      transition: jest.fn(() => ({
        duration: jest.fn(() => ({
          call: mockCall
        })),
        call: mockCall
      }))
    });

    render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    const resetButton = screen.getByTitle('Reset zoom');
    fireEvent.click(resetButton);
    
    expect(mockCall).toHaveBeenCalled();
  });

  it('handles window resize', async () => {
    const { container } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );

    // Simulate window resize
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    await waitFor(() => {
      // Verify the component responds to resize
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders with empty scores', () => {
    render(
      <KSAKnowledgeGraph 
        ksaScores={{}} 
        title="Empty Graph"
      />
    );
    
    expect(screen.getByText('Empty Graph')).toBeInTheDocument();
    expect(screen.getByText('Click on a KSA node to view details')).toBeInTheDocument();
  });

  it('applies correct container styling', () => {
    const { container } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-xl', 'shadow-lg', 'p-6');
  });

  it('renders grid layout correctly', () => {
    const { container } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    const gridContainer = container.querySelector('.grid-cols-1.lg\\:grid-cols-2');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('gap-6');
  });

  it('unmounts and cleans up properly', () => {
    const mockStop = jest.fn();
    
    (d3.forceSimulation as jest.Mock).mockReturnValue({
      force: jest.fn().mockReturnThis(),
      on: jest.fn(),
      stop: mockStop
    });

    const { unmount } = render(
      <KSAKnowledgeGraph 
        ksaScores={mockKsaScores} 
        title="Test Graph"
      />
    );
    
    unmount();
    
    expect(mockStop).toHaveBeenCalled();
  });
});