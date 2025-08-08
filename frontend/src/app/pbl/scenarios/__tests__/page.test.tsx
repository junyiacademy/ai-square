/**
 * Unit tests for PBL Scenarios page
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PBLScenariosPage from '../page';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock loading skeleton
jest.mock('@/components/pbl/loading-skeletons', () => ({
  PBLScenariosListSkeleton: () => <div>Loading...</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('PBLScenariosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<PBLScenariosPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should fetch and display scenarios', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          scenarios: [
            {
              id: 'scenario-1',
              title: 'AI Ethics Scenario',
              description: 'Learn about AI ethics',
              difficulty: 'beginner',
              estimatedMinutes: 60,
              ksaMapping: {
                knowledge: ['K1.1'],
                skills: ['S1.1'],
                attitudes: ['A1.1'],
              },
            },
          ],
        },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('AI Ethics Scenario')).toBeInTheDocument();
      expect(screen.getByText('Learn about AI ethics')).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should display difficulty stars correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          scenarios: [
            { id: '1', title: 'Beginner', difficulty: 'beginner' },
            { id: '2', title: 'Intermediate', difficulty: 'intermediate' },
            { id: '3', title: 'Advanced', difficulty: 'advanced' },
          ],
        },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('⭐')).toBeInTheDocument();
      expect(screen.getByText('⭐⭐⭐')).toBeInTheDocument();
      expect(screen.getByText('⭐⭐⭐⭐⭐')).toBeInTheDocument();
    });
  });

  it('should handle empty scenarios list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { scenarios: [] },
      }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.getByText('pbl:noScenarios')).toBeInTheDocument();
    });
  });

  it('should handle non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should pass language parameter to API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { scenarios: [] } }),
    });

    render(<PBLScenariosPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/pbl/scenarios?lang=en',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('should cleanup on unmount', () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { unmount } = render(<PBLScenariosPage />);
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});