import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KnowledgeGraph from '../KnowledgeGraph';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock HTMLCanvasElement methods
const mockGetContext = jest.fn();
HTMLCanvasElement.prototype.getContext = mockGetContext;

describe('KnowledgeGraph', () => {
  const mockT = jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'domains.items.engaging.name': 'Engaging with AI',
      'domains.items.creating.name': 'Creating with AI',
      'domains.items.managing.name': 'Managing AI',
      'domains.items.designing.name': 'Designing AI',
      'features.visualization.title': 'AI Literacy Visualization',
      'features.visualization.desc': 'Interactive knowledge graph',
    };
    return translations[key] || key;
  });

  const mockPush = jest.fn();
  const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: '' as CanvasTextAlign,
    textBaseline: '' as CanvasTextBaseline,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    mockGetContext.mockReturnValue(mockCtx);
    
    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the knowledge graph component', () => {
    render(<KnowledgeGraph />);
    
    expect(screen.getByText('AI Literacy Visualization')).toBeInTheDocument();
    expect(screen.getByText('Interactive knowledge graph')).toBeInTheDocument();
  });

  it('creates canvas element', () => {
    render(<KnowledgeGraph />);
    
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas).toHaveAttribute('aria-label', 'AI Literacy Knowledge Graph');
  });

  it('initializes canvas context on mount', () => {
    render(<KnowledgeGraph />);
    
    expect(mockGetContext).toHaveBeenCalledWith('2d');
  });

  it('renders all four domains', () => {
    render(<KnowledgeGraph />);
    
    // Check domain buttons
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('🎨')).toBeInTheDocument();
    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('🏗️')).toBeInTheDocument();
    
    expect(screen.getByText('Engaging with AI')).toBeInTheDocument();
    expect(screen.getByText('Creating with AI')).toBeInTheDocument();
    expect(screen.getByText('Managing AI')).toBeInTheDocument();
    expect(screen.getByText('Designing AI')).toBeInTheDocument();
  });

  it('handles domain hover interactions', () => {
    render(<KnowledgeGraph />);
    
    const engagingButton = screen.getByText('🎯').closest('button')!;
    
    fireEvent.mouseEnter(engagingButton);
    expect(engagingButton).toHaveClass('scale-110');
    
    fireEvent.mouseLeave(engagingButton);
    expect(engagingButton).not.toHaveClass('scale-110');
  });

  it('handles domain click and navigation', () => {
    render(<KnowledgeGraph />);
    
    const creatingButton = screen.getByText('🎨').closest('button')!;
    fireEvent.click(creatingButton);
    
    expect(mockPush).toHaveBeenCalledWith('/relations?domain=creating_with_ai');
  });

  it('displays competency count for each domain', () => {
    render(<KnowledgeGraph />);
    
    expect(screen.getByText('5 competencies')).toBeInTheDocument();
    expect(screen.getByText('6 competencies')).toBeInTheDocument();
    expect(screen.getByText('4 competencies')).toBeInTheDocument();
  });

  it('handles canvas resize on window resize', () => {
    const { container } = render(<KnowledgeGraph />);
    const canvas = container.querySelector('canvas')!;
    
    // Set initial size
    Object.defineProperty(canvas, 'offsetWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'offsetHeight', { value: 600, configurable: true });
    
    // Trigger resize
    fireEvent(window, new Event('resize'));
    
    expect(canvas.width).toBe(1600); // 800 * 2 (devicePixelRatio)
    expect(canvas.height).toBe(1200); // 600 * 2
  });

  it('updates mouse position on canvas mouse move', () => {
    const { container } = render(<KnowledgeGraph />);
    const canvas = container.querySelector('canvas')!;
    
    fireEvent.mouseMove(canvas, {
      clientX: 100,
      clientY: 200,
    });
    
    // Animation frame should trigger canvas redraw
    expect(mockCtx.clearRect).toHaveBeenCalled();
  });

  it('applies hover effect when mouse is near domain', async () => {
    render(<KnowledgeGraph />);
    
    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement;
    
    // Simulate mouse move near a domain
    fireEvent.mouseMove(canvas, {
      clientX: 400,
      clientY: 300,
    });
    
    await waitFor(() => {
      // Check if domain buttons show hover state
      const buttons = screen.getAllByRole('button');
      const hoveredButton = buttons.find(btn => btn.classList.contains('scale-110'));
      expect(hoveredButton).toBeDefined();
    });
  });

  it('cleans up animation frame on unmount', () => {
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');
    
    const { unmount } = render(<KnowledgeGraph />);
    unmount();
    
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('renders domain info cards on hover', () => {
    render(<KnowledgeGraph />);
    
    const managingButton = screen.getByText('🎮').closest('button')!;
    fireEvent.mouseEnter(managingButton);
    
    // Check if additional info is displayed
    expect(screen.getByText('Managing AI')).toBeInTheDocument();
    expect(screen.getByText('4 competencies')).toBeInTheDocument();
  });

  it('handles touch events on mobile', () => {
    render(<KnowledgeGraph />);
    
    const designingButton = screen.getByText('🏗️').closest('button')!;
    
    fireEvent.touchStart(designingButton);
    expect(designingButton).toHaveClass('scale-110');
    
    fireEvent.touchEnd(designingButton);
    expect(mockPush).toHaveBeenCalledWith('/relations?domain=designing_with_ai');
  });

  it('updates canvas drawing on domain positions change', () => {
    render(<KnowledgeGraph />);
    
    // Initial draw
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Trigger animation frame
    fireEvent(window, new Event('resize'));
    
    // Check redraw
    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });
});
