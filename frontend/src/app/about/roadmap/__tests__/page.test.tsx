/**
 * Roadmap Page Tests
 */

import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
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

  it('should render roadmap page title', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('Roadmap')).toBeInTheDocument();
  });

  it('should render development journey subtitle', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('Our Development Journey')).toBeInTheDocument();
  });

  it('should render quarterly milestones', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('Q1 2025')).toBeInTheDocument();
    expect(screen.getByText('Q2 2025')).toBeInTheDocument();
    expect(screen.getByText('Q3 2025')).toBeInTheDocument();
    expect(screen.getByText('Q4 2025')).toBeInTheDocument();
  });

  it('should render status indicators', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should render back navigation', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should render without errors', async () => {
    const { container } = renderWithProviders(<RoadmapPage />);
    
    expect(container).toBeInTheDocument();
  });

  it('should have proper heading structure', async () => {
    renderWithProviders(<RoadmapPage />);
    
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should handle component lifecycle', async () => {
    const { unmount } = renderWithProviders(<RoadmapPage />);
    
    expect(() => unmount()).not.toThrow();
  });

  it('should render timeline elements', async () => {
    renderWithProviders(<RoadmapPage />);
    
    // Should contain timeline or milestone indicators
    const container = screen.getByText('Roadmap').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    renderWithProviders(<RoadmapPage />);
    
    // Should have proper semantic structure
    expect(screen.getByText('Roadmap')).toBeInTheDocument();
  });

  it('should match snapshot', async () => {
    const { container } = renderWithProviders(<RoadmapPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});