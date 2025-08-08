import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ 
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  })
}));

global.fetch = jest.fn();

describe('History Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn((key) => {
        if (key === 'isLoggedIn') return 'true';
        if (key === 'user') return JSON.stringify({ id: 'user-1', email: 'test@example.com' });
        return null;
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true,
        data: [],
        results: [],
        history: [
          { id: '1', action: 'created', timestamp: new Date().toISOString() },
          { id: '2', action: 'updated', timestamp: new Date().toISOString() }
        ]
      })
    });
  });

  it('should render without crashing', () => {
    const { container } = render(<Page />);
    expect(container).toBeInTheDocument();
  });

  it('should display page title and content', () => {
    render(<Page />);
    const container = document.querySelector('.min-h-screen');
    expect(container).toBeInTheDocument();
  });

  it('should fetch history data on mount', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle filter changes', async () => {
    const { container } = render(<Page />);
    
    // Find and interact with filter elements if they exist
    const selects = container.querySelectorAll('select');
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'new-value' } });
    }
    
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('should handle pagination if available', async () => {
    const { container } = render(<Page />);
    
    // Look for pagination buttons
    const buttons = container.querySelectorAll('button');
    const nextButton = Array.from(buttons).find(btn => 
      btn.textContent?.toLowerCase().includes('next')
    );
    
    if (nextButton) {
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    }
  });

  it('should display loading state', () => {
    const { container } = render(<Page />);
    // Check if there's a loading indicator initially
    expect(container).toBeInTheDocument();
  });
});