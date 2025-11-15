import React from 'react';
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import { I18nProvider } from '../I18nProvider';
import i18n from '@/i18n';

// Mock i18n module
jest.mock('@/i18n', () => ({
  language: 'en',
  changeLanguage: jest.fn(),
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  t: jest.fn((key) => key),
}));

// Mock I18nextProvider
jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18next-provider">{children}</div>
  ),
}));

describe('I18nProvider', () => {
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders children within I18nextProvider after initialization', async () => {
    renderWithProviders(
      <I18nProvider>
        <div data-testid="test-child">Test Content</div>
      </I18nProvider>
    );

    // After initialization, shows I18nextProvider
    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  it('does not change language when no saved language in localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    renderWithProviders(
      <I18nProvider>
        <div>Test</div>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ai-square-language');
    expect(i18n.changeLanguage).not.toHaveBeenCalled();
  });

  it('changes language when saved language differs from current', async () => {
    mockLocalStorage.getItem.mockReturnValue('zhTW');
    (i18n as any).language = 'en';

    renderWithProviders(
      <I18nProvider>
        <div>Test</div>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ai-square-language');
    expect(i18n.changeLanguage).toHaveBeenCalledWith('zhTW');
  });

  it('does not change language when saved language is same as current', async () => {
    mockLocalStorage.getItem.mockReturnValue('en');
    (i18n as any).language = 'en';

    renderWithProviders(
      <I18nProvider>
        <div>Test</div>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ai-square-language');
    expect(i18n.changeLanguage).not.toHaveBeenCalled();
  });

  it('handles localStorage errors gracefully', async () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not throw error
    renderWithProviders(
      <I18nProvider>
        <div>Test</div>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    });

    expect(i18n.changeLanguage).not.toHaveBeenCalled();
  });

  it('handles i18n.changeLanguage errors gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue('zhTW');
    (i18n.changeLanguage as jest.Mock).mockRejectedValue(new Error('Change language error'));

    // Should not throw error
    renderWithProviders(
      <I18nProvider>
        <div>Test</div>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    });
  });

  it('preserves children props and structure', async () => {
    const ChildComponent = ({ text, id }: { text: string; id: string }) => (
      <div data-testid={id}>{text}</div>
    );

    renderWithProviders(
      <I18nProvider>
        <ChildComponent text="Child 1" id="child-1" />
        <ChildComponent text="Child 2" id="child-2" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('child-1')).toHaveTextContent('Child 1');
      expect(screen.getByTestId('child-2')).toHaveTextContent('Child 2');
    });
  });

  it('only initializes once when re-rendered', async () => {
    const { rerender } = renderWithProviders(
      <I18nProvider>
        <div>Initial</div>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    });

    const initialGetItemCalls = mockLocalStorage.getItem.mock.calls.length;

    // Re-render with different children
    rerender(
      <I18nProvider>
        <div>Updated</div>
      </I18nProvider>
    );

    await waitFor(() => {
        const element = screen.queryByText('Updated');
        if (element) expect(element).toBeInTheDocument();
      }, { timeout: 1000 });

    // localStorage.getItem should not be called again
    expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(initialGetItemCalls);
  });
});
