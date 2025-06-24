import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KSADisplayPage from '../page';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
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
            summary: "Be accountable; seek to prevent harm from AI use"
          }
        }
      }
    }
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(mockKSAData),
  })
) as jest.Mock;

describe('KSA Display Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      render(<KSADisplayPage />);
      
      expect(screen.getByText('Loading KSA Framework...')).toBeInTheDocument();
      expect(screen.getByText('Loading KSA Framework...')).toBeInTheDocument();
    });
  });

  describe('Data Loading and Display', () => {
    it('should fetch and display KSA data', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Literacy Framework')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/ksa?lang=en');
      expect(screen.getByText('Knowledge, Skills, and Attitudes for AI Education')).toBeInTheDocument();
    });

    it('should display section navigation with correct counts', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Knowledge (K)')).toBeInTheDocument();
      });

      // Check for count badge
      const countBadges = screen.getAllByText('1');
      expect(countBadges.length).toBeGreaterThan(0); // Should have at least one "1" count
      expect(screen.getByText('Skills (S)')).toBeInTheDocument();
      expect(screen.getByText('Attitudes (A)')).toBeInTheDocument();
    });
  });

  describe('Section Navigation', () => {
    it('should switch between Knowledge, Skills, and Attitudes sections', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Literacy Framework')).toBeInTheDocument();
      });

      // Initially Knowledge section should be active
      expect(screen.getByText('Knowledge framework description')).toBeInTheDocument();

      // Click on Skills
      const skillsButton = screen.getByRole('button', { name: /Skills \(S\)/ });
      await userEvent.click(skillsButton);
      
      expect(screen.getByText('Skills framework description')).toBeInTheDocument();

      // Click on Attitudes
      const attitudesButton = screen.getByRole('button', { name: /Attitudes \(A\)/ });
      await userEvent.click(attitudesButton);
      
      expect(screen.getByText('Attitudes framework description')).toBeInTheDocument();
    });

    it('should highlight active section button', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Literacy Framework')).toBeInTheDocument();
      });

      const knowledgeButton = screen.getByRole('button', { name: /Knowledge \(K\)/ });
      const skillsButton = screen.getByRole('button', { name: /Skills \(S\)/ });

      // Knowledge should be active initially
      expect(knowledgeButton).toHaveClass('bg-indigo-600', 'text-white');
      expect(skillsButton).toHaveClass('bg-white', 'text-gray-700');

      // Click Skills
      await userEvent.click(skillsButton);

      expect(skillsButton).toHaveClass('bg-indigo-600', 'text-white');
      expect(knowledgeButton).toHaveClass('bg-white', 'text-gray-700');
    });
  });

  describe('Theme Cards', () => {
    it('should display theme cards with correct information', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
      });

      expect(screen.getByText('Understanding AI fundamentals')).toBeInTheDocument();
      expect(screen.getByText('2 codes')).toBeInTheDocument();
    });

    it('should expand and collapse theme details', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
      });

      // Initially codes should be hidden
      expect(screen.queryByText('K1.1')).not.toBeInTheDocument();

      // Click to expand
      const themeCard = screen.getByText('The Nature Of AI');
      await userEvent.click(themeCard);

      // Codes should now be visible
      expect(screen.getByText('K1.1')).toBeInTheDocument();
      expect(screen.getByText('K1.2')).toBeInTheDocument();
      expect(screen.getByText('AI systems use algorithms that combine step-by-step procedures')).toBeInTheDocument();

      // Click to collapse
      await userEvent.click(themeCard);

      // Codes should be hidden again
      expect(screen.queryByText('K1.1')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter themes based on search term', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search themes, codes, or content...');
      
      // Search for "algorithm"
      await userEvent.type(searchInput, 'algorithm');

      expect(screen.getByText('1 themes found for "algorithm"')).toBeInTheDocument();
      expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
    });

    it('should show no results message when search yields no matches', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search themes, codes, or content...');
      
      // Search for something that doesn't exist
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms.')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('The Nature Of AI')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search themes, codes, or content...');
      
      // Type search term
      await userEvent.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');

      // Click clear button
      const clearButton = screen.getByRole('button', { name: '' }); // Clear button with X icon
      await userEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Questions Display', () => {
    it('should display reflection questions for skills', async () => {
      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Literacy Framework')).toBeInTheDocument();
      });

      // Switch to Skills section
      const skillsButton = screen.getByRole('button', { name: /Skills \(S\)/ });
      await userEvent.click(skillsButton);

      // Expand Critical Thinking theme
      const themeCard = screen.getByText('Critical Thinking');
      await userEvent.click(themeCard);

      // Check for questions
      expect(screen.getByText('Reflection Questions')).toBeInTheDocument();
      expect(screen.getByText('How do you verify AI outputs?')).toBeInTheDocument();
      expect(screen.getByText('What biases might exist?')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

      render(<KSADisplayPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load KSA data')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle responsive design', () => {
      render(<KSADisplayPage />);
      
      // Should render without crashing
      expect(screen.getByText('Loading KSA Framework...')).toBeInTheDocument();
    });
  });
});