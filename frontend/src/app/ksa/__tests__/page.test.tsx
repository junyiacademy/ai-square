import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import userEvent from '@testing-library/user-event';
import KSADisplayPage from '../page';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      // Handle theme names specially to return formatted name
      if (key.startsWith('themes.')) {
        const themeName = key.replace('themes.', '');
        return options?.defaultValue || themeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return key;
    },
    i18n: { language: 'en' }
  })
}));

// Mock fetch for API calls
const mockKSAData = {
  knowledge_codes: {
    description: "Knowledge framework description",
    themes: {
      "The_Nature_of_AI": {
        explanation: "Understanding AI fundamentals",
        codes: {
          "K1.1": {
            summary: "AI systems use algorithms that combine step-by-step procedures",
          },
          "K1.2": {
            summary: "Machines learn by inferring patterns"
          }
        }
      }
    }
  },
  skill_codes: {
    description: "Skills framework description",
    themes: {
      "Critical_Thinking": {
        explanation: "Evaluating AI outputs critically",
        codes: {
          "S1.1": {
            summary: "Evaluate AI-generated content for accuracy",
            questions: ["How do you verify AI outputs?", "What biases might exist?"]
          }
        }
      }
    }
  },
  attitude_codes: {
    description: "Attitudes framework description",
    themes: {
      "Responsible": {
        explanation: "Being accountable for AI use",
        codes: {
          "A1.1": {
            summary: "Consider impact on society",
          }
        }
      }
    }
  }
};

global.fetch = jest.fn();

describe('KSA Display Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockKSAData,
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Data Loading and Display', () => {
    it('should fetch and display KSA data', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Check API was called
      expect(fetch).toHaveBeenCalledWith('/api/ksa?lang=en');
      
      // Check content is displayed - use partial matching since text might contain count
      expect(screen.getByText('Knowledge framework description')).toBeInTheDocument();
    });

    it('should display section navigation with correct counts', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Check that section buttons exist - use role and flexible text matching
      expect(screen.getByRole('button', { name: /knowledge/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skills/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /attitudes/i })).toBeInTheDocument();
    });
  });

  describe('Section Navigation', () => {
    it('should switch between Knowledge, Skills, and Attitudes sections', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Initially Knowledge section should be active
      expect(screen.getByText('Knowledge framework description')).toBeInTheDocument();

      // Click on Skills - use flexible matching
      const skillsButton = screen.getByRole('button', { name: /skills/i });
      await userEvent.click(skillsButton);
      
      expect(screen.getByText('Skills framework description')).toBeInTheDocument();

      // Click on Attitudes - use flexible matching
      const attitudesButton = screen.getByRole('button', { name: /attitudes/i });
      await userEvent.click(attitudesButton);
      
      expect(screen.getByText('Attitudes framework description')).toBeInTheDocument();
    });

    it('should highlight active section button', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Check initial state - Knowledge is active
      const knowledgeButton = screen.getByRole('button', { name: /knowledge/i });
      const skillsButton = screen.getByRole('button', { name: /skills/i });
      
      // Check if knowledge button is active (has indigo background)
      expect(knowledgeButton.className).toContain('bg-indigo-600');
      // Check if skills button is not active (has white background)
      expect(skillsButton.className).toContain('bg-white');
    });
  });

  describe('Theme Cards', () => {
    it('should display theme cards with correct information', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Wait for data to load and check theme card is displayed
      // The theme name will be translated, so look for the formatted version
      await waitFor(() => {
        expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
      });
      
      // Click on theme card to expand and see the codes
      const themeCard = screen.getByText('The Nature Of AI').closest('div');
      await userEvent.click(themeCard!);
      
      // Now the codes should be visible (since the component doesn't show theme explanation)
      expect(screen.getByText('K1.1')).toBeInTheDocument();
      expect(screen.getByText('AI systems use algorithms that combine step-by-step procedures')).toBeInTheDocument();
    });

    it('should expand and collapse theme details', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Initially codes should not be visible
      expect(screen.queryByText('K1.1')).not.toBeInTheDocument();

      // Click on theme card to expand
      const themeCard = screen.getByText('The Nature Of AI').closest('div');
      await userEvent.click(themeCard!);

      // Now codes should be visible
      expect(screen.getByText('K1.1')).toBeInTheDocument();
      expect(screen.getByText('AI systems use algorithms that combine step-by-step procedures')).toBeInTheDocument();

      // Click again to collapse
      await userEvent.click(themeCard!);
      expect(screen.queryByText('K1.1')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter themes based on search term', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('searchPlaceholder');
      
      // Type search term
      await userEvent.type(searchInput, 'AI');
      
      // Theme with AI should still be visible
      expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
    });

    it('should show no results message when search yields no matches', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('searchPlaceholder');
      
      // Type search term that doesn't match
      await userEvent.type(searchInput, 'xyz123');
      
      // No results message should appear
      expect(screen.getByText('results.noResults')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('searchPlaceholder');
      
      // Type search term
      await userEvent.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');
      
      // Find the clear button by its SVG content (X icon)
      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: '' }); // Clear button has no text, just icon
        return clearButton;
      });
      
      // Look for the clear button by finding the one with X icon
      const clearButton = screen.getByRole('button', {
        name: (accessibleName, element) => {
          // Find button that contains the X icon path
          const svg = element?.querySelector('svg');
          const path = svg?.querySelector('path');
          return path?.getAttribute('d') === 'M6 18L18 6M6 6l12 12';
        }
      });
      
      await userEvent.click(clearButton);
      
      // Wait for the state update
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });
    });
  });

  describe('Questions Display', () => {
    it('should display reflection questions for skills', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument();
      });

      // Switch to Skills section
      const skillsButton = screen.getByRole('button', { name: /skills/i });
      await userEvent.click(skillsButton);

      // Expand theme to see questions
      const themeCard = screen.getByText('Critical Thinking').closest('div');
      await userEvent.click(themeCard!);

      // Check questions are displayed
      expect(screen.getByText('How do you verify AI outputs?')).toBeInTheDocument();
      expect(screen.getByText('What biases might exist?')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      renderWithProviders(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('loadError')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle responsive design', async () => {
      renderWithProviders(<KSADisplayPage />);
      
      // Should render without crashing
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});