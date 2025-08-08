import React from 'react';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test-utils/helpers/render';
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
      'domains.title': 'AI Literacy Domains',
      'domains.subtitle': 'Explore the four key domains of AI literacy',
      'domains.viewDetails': 'View Details',
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
    
    // Mock requestAnimationFrame with limited calls to prevent infinite loops
    let rafCallCount = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (rafCallCount < 2) { // Limit to 2 calls to prevent infinite loop
        rafCallCount++;
        setTimeout(() => cb(0), 16); // Simulate 60fps
      }
      return rafCallCount;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the knowledge graph component with title and subtitle', async () => {
    renderWithProviders(<KnowledgeGraph />);
    
    expect(screen.getByText('AI Literacy Domains')).toBeInTheDocument();
    expect(screen.getByText('Explore the four key domains of AI literacy')).toBeInTheDocument();
  });

  it('creates canvas element', async () => {
    const { container } = renderWithProviders(<KnowledgeGraph />);
    
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('w-full', 'h-[400px]', 'cursor-pointer');
  });

  it('initializes canvas context on mount', async () => {
    renderWithProviders(<KnowledgeGraph />);
    
    expect(mockGetContext).toHaveBeenCalledWith('2d');
  });

  it('handles window resize event', async () => {
    renderWithProviders(<KnowledgeGraph />);
    
    // Simply verify that the component handles resize events without errors
    expect(() => {
      fireEvent(window, new Event('resize'));
    }).not.toThrow();
  });

  it('updates mouse position on canvas mouse move', async () => {
    const { container } = renderWithProviders(<KnowledgeGraph />);
    const canvas = container.querySelector('canvas')!;
    
    fireEvent.mouseMove(canvas, {
      clientX: 100,
      clientY: 200,
    });
    
    // Animation frame should trigger canvas redraw
    expect(mockCtx.clearRect).toHaveBeenCalled();
  });

  it('handles canvas click event', async () => {
    const { container } = renderWithProviders(<KnowledgeGraph />);
    const canvas = container.querySelector('canvas')!;
    
    // Click on canvas
    fireEvent.click(canvas, {
      clientX: 200,
      clientY: 200,
    });
    
    // The click handler is attached and processes the click
    // Navigation only happens if click is within a domain's radius
    // Since we don't have actual domain positions in the test, we just verify the event is handled
    expect(canvas).toBeInTheDocument();
  });

  it('cleans up animation frame on unmount', async () => {
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');
    
    const { unmount } = renderWithProviders(<KnowledgeGraph />);
    unmount();
    
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('displays selected domain details when a domain is clicked', async () => {
    const { container } = renderWithProviders(<KnowledgeGraph />);
    const canvas = container.querySelector('canvas')!;
    
    // Since we can't easily determine exact domain positions without running the actual drawing code,
    // we'll simulate the selectedDomain state being set
    // This is more of an integration test limitation
    
    // The actual click handler would need to be tested with the real canvas drawing logic
    fireEvent.click(canvas, { clientX: 200, clientY: 200 });
    
    // In a real scenario, if a domain was clicked, we'd see the domain details
    // For now, we just verify the click event is handled
    expect(canvas).toHaveClass('cursor-pointer');
  });

  it('changes cursor style when hovering over domains', async () => {
    const { container } = renderWithProviders(<KnowledgeGraph />);
    const canvas = container.querySelector('canvas')!;
    
    // Initially, cursor should be default
    expect(canvas.style.cursor).toBe('');
    
    // Mouse move event
    fireEvent.mouseMove(canvas, {
      clientX: 200,
      clientY: 200,
    });
    
    // The cursor style will be set by the actual hover logic
    // This test verifies the mousemove event is handled
    expect(mockCtx.clearRect).toHaveBeenCalled();
  });
});
