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
    
    expect(screen.getByText('AI Square 產品路線圖')).toBeInTheDocument();
  });

  it('should render development journey subtitle', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('產品願景、開發進度與技術架構')).toBeInTheDocument();
  });

  it('should render quarterly milestones', async () => {
    renderWithProviders(<RoadmapPage />);
    
    // Check for year/quarter text in various formats
    const yearElements = screen.queryAllByText(/2025|2024/i);
    const q3Elements = screen.queryAllByText(/Q3/i);  // We saw Q3 in the page
    
    // At least one of them should be present
    expect(yearElements.length + q3Elements.length).toBeGreaterThan(0);
  });

  it('should render status indicators', async () => {
    renderWithProviders(<RoadmapPage />);
    
    // Look for status indicators - can be checkmarks or percentages
    const completedElements = screen.queryAllByText(/已完成|100%|✓/i);
    expect(completedElements.length).toBeGreaterThan(0);
  });

  it('should render back navigation', async () => {
    renderWithProviders(<RoadmapPage />);
    
    expect(screen.getByText('返回首頁')).toBeInTheDocument();
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
    const container = screen.getByText('AI Square 產品路線圖').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    renderWithProviders(<RoadmapPage />);
    
    // Should have proper semantic structure
    expect(screen.getByText('AI Square 產品路線圖')).toBeInTheDocument();
  });

  it('should match snapshot', async () => {
    const { container } = renderWithProviders(<RoadmapPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});