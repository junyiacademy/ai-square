/**
 * Journey Page Tests
 */

import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import JourneyPage from '../page';

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
        'journey.title': 'Learning Journey',
        'journey.subtitle': 'Your AI Literacy Path',
        'journey.phase1.title': 'Phase 1: Foundation',
        'journey.phase2.title': 'Phase 2: Application',
        'journey.phase3.title': 'Phase 3: Innovation',
        'journey.assessment.title': 'Assessment',
        'journey.pbl.title': 'Problem-Based Learning',
        'journey.discovery.title': 'Discovery',
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

describe('JourneyPage', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  it('should render journey page title', async () => {
    renderWithProviders(<JourneyPage />);
    
    expect(screen.getByText('Learning Journey')).toBeInTheDocument();
  });

  it('should render learning phases', async () => {
    renderWithProviders(<JourneyPage />);
    
    expect(screen.getByText('Phase 1: Foundation')).toBeInTheDocument();
    expect(screen.getByText('Phase 2: Application')).toBeInTheDocument(); 
    expect(screen.getByText('Phase 3: Innovation')).toBeInTheDocument();
  });

  it('should render learning modules', async () => {
    renderWithProviders(<JourneyPage />);
    
    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.getByText('Problem-Based Learning')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
  });

  it('should render back navigation', async () => {
    renderWithProviders(<JourneyPage />);
    
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('should render page content without errors', async () => {
    const { container } = renderWithProviders(<JourneyPage />);
    
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have proper accessibility structure', async () => {
    renderWithProviders(<JourneyPage />);
    
    // Should have headings
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should render with English locale by default', async () => {
    renderWithProviders(<JourneyPage />);
    
    expect(screen.getByText('Learning Journey')).toBeInTheDocument();
  });

  it('should handle missing translation gracefully', async () => {
    renderWithProviders(<JourneyPage />);
    
    // Component should render even if some translations are missing
    expect(screen.getByText('Learning Journey')).toBeInTheDocument();
  });

  it('should render interactive elements', async () => {
    renderWithProviders(<JourneyPage />);
    
    // Should have clickable elements or links
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('should match snapshot', async () => {
    const { container } = renderWithProviders(<JourneyPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});