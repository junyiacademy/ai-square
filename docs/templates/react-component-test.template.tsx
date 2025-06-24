/**
 * React 組件測試模板
 * 
 * 使用方式：
 * 1. 複製此模板到 src/components/[ComponentName]/__tests__/[ComponentName].test.tsx
 * 2. 替換 [ComponentName] 為實際組件名稱
 * 3. 替換 mock 數據和期望行為
 * 4. 根據組件特性添加或修改測試案例
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { [ComponentName] } from '../[ComponentName]';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
  })
}));

// Mock any other external dependencies
jest.mock('@/services/api');
jest.mock('@/hooks/useAuth');

describe('[ComponentName]', () => {
  const defaultProps = {
    // Define default props for your component
    id: 'test-id',
    title: 'Test Title',
    onAction: jest.fn(),
  };

  const mockData = {
    // Define mock data used in tests
    user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    items: [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with required props', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} />);
      
      // Assert
      expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
      expect(screen.getByTestId(defaultProps.id)).toBeInTheDocument();
    });

    it('should render with optional props', () => {
      // Arrange
      const propsWithOptional = {
        ...defaultProps,
        subtitle: 'Test Subtitle',
        showActions: true,
      };
      
      // Act
      render(<[ComponentName] {...propsWithOptional} />);
      
      // Assert
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not render when required props are missing', () => {
      // Arrange & Act & Assert
      expect(() => {
        render(<[ComponentName] />);
      }).toThrow();
    });

    it('should apply custom className', () => {
      // Arrange
      const customClass = 'custom-class';
      
      // Act
      render(<[ComponentName] {...defaultProps} className={customClass} />);
      
      // Assert
      expect(screen.getByTestId(defaultProps.id)).toHaveClass(customClass);
    });
  });

  describe('User Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      
      render(<[ComponentName] {...defaultProps} onClick={mockOnClick} />);
      
      // Act
      await user.click(screen.getByRole('button'));
      
      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should handle form submission', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      
      render(<[ComponentName] {...defaultProps} onSubmit={mockOnSubmit} />);
      
      // Act
      await user.type(screen.getByLabelText(/input/i), 'test input');
      await user.click(screen.getByRole('button', { name: /submit/i }));
      
      // Assert
      expect(mockOnSubmit).toHaveBeenCalledWith({
        input: 'test input'
      });
    });

    it('should handle keyboard navigation', async () => {
      // Arrange
      const user = userEvent.setup();
      
      render(<[ComponentName] {...defaultProps} />);
      
      // Act
      await user.tab();
      
      // Assert
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('should prevent action when disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      
      render(<[ComponentName] {...defaultProps} onClick={mockOnClick} disabled />);
      
      // Act
      await user.click(screen.getByRole('button'));
      
      // Assert
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should update internal state on user input', async () => {
      // Arrange
      const user = userEvent.setup();
      
      render(<[ComponentName] {...defaultProps} />);
      
      // Act
      await user.type(screen.getByRole('textbox'), 'new value');
      
      // Assert
      expect(screen.getByDisplayValue('new value')).toBeInTheDocument();
    });

    it('should reset state when reset button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      
      render(<[ComponentName] {...defaultProps} />);
      
      // Act
      await user.type(screen.getByRole('textbox'), 'some text');
      await user.click(screen.getByRole('button', { name: /reset/i }));
      
      // Assert
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('Data Loading', () => {
    it('should show loading state while fetching data', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} loading />);
      
      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display data when loaded successfully', async () => {
      // Arrange
      const mockFetch = jest.fn().mockResolvedValue(mockData);
      
      // Act
      render(<[ComponentName] {...defaultProps} onFetch={mockFetch} />);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(mockData.user.name)).toBeInTheDocument();
      });
    });

    it('should show error message when data loading fails', async () => {
      // Arrange
      const mockFetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));
      
      // Act
      render(<[ComponentName] {...defaultProps} onFetch={mockFetch} />);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockData);
      
      render(<[ComponentName] {...defaultProps} onFetch={mockFetch} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
      
      // Act
      await user.click(screen.getByRole('button', { name: /retry/i }));
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(mockData.user.name)).toBeInTheDocument();
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Conditional Rendering', () => {
    it('should render empty state when no data', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} data={[]} />);
      
      // Assert
      expect(screen.getByText(/no items found/i)).toBeInTheDocument();
    });

    it('should show/hide elements based on permissions', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} userRole="admin" />);
      
      // Assert
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should hide sensitive elements for non-admin users', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} userRole="user" />);
      
      // Assert
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} />);
      
      // Assert
      expect(screen.getByLabelText(/main content/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      // Arrange
      const user = userEvent.setup();
      
      render(<[ComponentName] {...defaultProps} />);
      
      // Act & Assert
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(defaultProps.onAction).toHaveBeenCalled();
    });

    it('should announce changes to screen readers', async () => {
      // Arrange
      const user = userEvent.setup();
      
      render(<[ComponentName] {...defaultProps} />);
      
      // Act
      await user.click(screen.getByRole('button'));
      
      // Assert
      expect(screen.getByRole('status')).toHaveTextContent(/action completed/i);
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      // Act
      render(<[ComponentName] {...defaultProps} />);
      
      // Assert
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('should show desktop layout on larger screens', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      // Act
      render(<[ComponentName] {...defaultProps} />);
      
      // Assert
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('should display content in default language', () => {
      // Arrange & Act
      render(<[ComponentName] {...defaultProps} />);
      
      // Assert
      expect(screen.getByText('expectedKey')).toBeInTheDocument();
    });

    it('should handle missing translations gracefully', () => {
      // Arrange
      const mockT = jest.fn().mockReturnValue('missing.key');
      
      // Mock useTranslation to return our mock
      jest.mocked(require('react-i18next').useTranslation).mockReturnValue({
        t: mockT,
        i18n: { language: 'es' }
      });
      
      // Act
      render(<[ComponentName] {...defaultProps} />);
      
      // Assert
      expect(mockT).toHaveBeenCalledWith('expectedKey');
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display errors gracefully', () => {
      // Arrange
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      // Act & Assert
      expect(() => {
        render(
          <[ComponentName] {...defaultProps}>
            <ThrowError />
          </[ComponentName]>
        );
      }).not.toThrow();
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});

/*
TDD 檢查清單：

✅ 測試先於實現
✅ 每個測試專注於一個行為
✅ 使用描述性的測試名稱
✅ 遵循 Arrange-Act-Assert 模式
✅ Mock 外部依賴
✅ 測試用戶交互行為
✅ 測試各種狀態（loading, error, success）
✅ 測試條件渲染
✅ 測試可訪問性
✅ 測試響應式設計
✅ 測試國際化
✅ 測試錯誤處理

記住：
- 測試行為，不是實現細節
- 從用戶角度思考測試
- 保持測試簡單和專注
- 一次只寫一個測試，讓它通過再繼續
*/