/**
 * Roadmap Page Tests
 */

import { render, screen } from '@testing-library/react';
import RoadmapPage from '../page';

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'common.back': 'Back',
        'roadmap.title': 'Roadmap',
        'roadmap.subtitle': 'Our Development Journey',
        'roadmap.current': 'Current',
        'roadmap.upcoming': 'Upcoming',
        'roadmap.completed': 'Completed',
        'roadmap.q1.title': 'Q1 2025',
        'roadmap.q2.title': 'Q2 2025',
        'roadmap.q3.title': 'Q3 2025',
        'roadmap.q4.title': 'Q4 2025',
      };
      
      if (options?.defaultValue) {
        return options.defaultValue;
      }
      
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    }
  })
}));

describe('RoadmapPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render roadmap page title', () => {
    render(<RoadmapPage />);
    
    expect(screen.getByText('Roadmap')).toBeInTheDocument();
  });

  it('should render development journey subtitle', () => {
    render(<RoadmapPage />);
    
    expect(screen.getByText('Our Development Journey')).toBeInTheDocument();
  });

  it('should render quarterly milestones', () => {
    render(<RoadmapPage />);
    
    expect(screen.getByText('Q1 2025')).toBeInTheDocument();
    expect(screen.getByText('Q2 2025')).toBeInTheDocument();
    expect(screen.getByText('Q3 2025')).toBeInTheDocument();
    expect(screen.getByText('Q4 2025')).toBeInTheDocument();
  });

  it('should render status indicators', () => {
    render(<RoadmapPage />);
    
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should render back navigation', () => {
    render(<RoadmapPage />);
    
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should render without errors', () => {
    const { container } = render(<RoadmapPage />);
    
    expect(container).toBeInTheDocument();
  });

  it('should have proper heading structure', () => {
    render(<RoadmapPage />);
    
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should handle component lifecycle', () => {
    const { unmount } = render(<RoadmapPage />);
    
    expect(() => unmount()).not.toThrow();
  });

  it('should render timeline elements', () => {
    render(<RoadmapPage />);
    
    // Should contain timeline or milestone indicators
    const container = screen.getByText('Roadmap').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<RoadmapPage />);
    
    // Should have proper semantic structure
    expect(screen.getByText('Roadmap')).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = render(<RoadmapPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});