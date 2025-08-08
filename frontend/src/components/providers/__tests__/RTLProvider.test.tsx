import React from 'react';
import { renderWithProviders, screen, waitFor } from '@/test-utils/helpers/render';
import { RTLProvider } from '../RTLProvider';
import { useRTL } from '@/hooks/useRTL';
import '@testing-library/jest-dom';

// Mock the useRTL hook
jest.mock('@/hooks/useRTL', () => ({
  useRTL: jest.fn(),
}));

const mockUseRTL = useRTL as jest.Mock;

describe('RTLProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children without modification', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        <div data-testid="child-component">Test Content</div>
      </RTLProvider>
    );

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should call useRTL hook on mount', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        <div>Test</div>
      </RTLProvider>
    );

    expect(mockUseRTL).toHaveBeenCalledTimes(1);
    expect(mockUseRTL).toHaveBeenCalledWith();
  });

  it('should render multiple children correctly', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <span data-testid="child-3">Child 3</span>
      </RTLProvider>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  it('should handle empty children', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const { container } = renderWithProviders(
      <RTLProvider>
        {null}
      </RTLProvider>
    );

    expect(mockUseRTL).toHaveBeenCalledTimes(1);
    // When children is null, RTLProvider returns null
    expect(container.firstChild).toBeNull();
  });

  it('should handle undefined children', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const { container } = renderWithProviders(
      <RTLProvider>
        {undefined}
      </RTLProvider>
    );

    expect(mockUseRTL).toHaveBeenCalledTimes(1);
    // When children is undefined, RTLProvider returns null
    expect(container.firstChild).toBeNull();
  });

  it('should handle false children', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const { container } = renderWithProviders(
      <RTLProvider>
        {false}
      </RTLProvider>
    );

    expect(mockUseRTL).toHaveBeenCalledTimes(1);
    // When children is false, RTLProvider returns null
    expect(container.firstChild).toBeNull();
  });

  it('should handle conditional children', async () => {
    mockUseRTL.mockImplementation(() => {});
    const showContent = true;
    
    renderWithProviders(
      <RTLProvider>
        {showContent && <div data-testid="conditional-content">Conditional Content</div>}
      </RTLProvider>
    );

    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
    expect(screen.getByText('Conditional Content')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should work with complex nested components', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const ComplexChild = () => (
      <div data-testid="complex-child">
        <h1>Title</h1>
        <p>Paragraph</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    );

    renderWithProviders(
      <RTLProvider>
        <ComplexChild />
      </RTLProvider>
    );

    expect(screen.getByTestId('complex-child')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should handle useRTL hook throwing error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseRTL.mockImplementation(() => {
      throw new Error('RTL hook failed');
    });
    
    expect(() => {
      renderWithProviders(
        <RTLProvider>
          <div>Test</div>
        </RTLProvider>
      );
    }).toThrow('RTL hook failed');

    // React may try to render twice in dev mode or error boundaries
    expect(mockUseRTL).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should re-call useRTL on re-render', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const { rerender } = renderWithProviders(
      <RTLProvider>
        <div>Initial Content</div>
      </RTLProvider>
    );

    expect(mockUseRTL).toHaveBeenCalledTimes(1);

    rerender(
      <RTLProvider>
        <div>Updated Content</div>
      </RTLProvider>
    );

    expect(mockUseRTL).toHaveBeenCalledTimes(2);
  });

  it('should work with React fragments', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        <>
          <div data-testid="fragment-child-1">Fragment Child 1</div>
          <div data-testid="fragment-child-2">Fragment Child 2</div>
        </>
      </RTLProvider>
    );

    expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
    expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should handle string children', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        Plain text content
      </RTLProvider>
    );

    expect(screen.getByText('Plain text content')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should handle number children', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        {42}
      </RTLProvider>
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should handle array of children', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const items = ['Item 1', 'Item 2', 'Item 3'];
    
    renderWithProviders(
      <RTLProvider>
        {items.map((item, index) => (
          <div key={index} data-testid={`array-item-${index}`}>
            {item}
          </div>
        ))}
      </RTLProvider>
    );

    items.forEach((item, index) => {
      expect(screen.getByTestId(`array-item-${index}`)).toBeInTheDocument();
      expect(screen.getByText(item)).toBeInTheDocument();
    });
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should maintain component structure with providers', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const TestProvider = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="test-provider">{children}</div>
    );

    renderWithProviders(
      <RTLProvider>
        <TestProvider>
          <div data-testid="nested-content">Nested Content</div>
        </TestProvider>
      </RTLProvider>
    );

    expect(screen.getByTestId('test-provider')).toBeInTheDocument();
    expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should work with components that have props', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    const ComponentWithProps = ({ title, content }: { title: string; content: string }) => (
      <div data-testid="component-with-props">
        <h2>{title}</h2>
        <p>{content}</p>
      </div>
    );

    renderWithProviders(
      <RTLProvider>
        <ComponentWithProps title="Test Title" content="Test Content" />
      </RTLProvider>
    );

    expect(screen.getByTestId('component-with-props')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should handle mixed content types', async () => {
    mockUseRTL.mockImplementation(() => {});
    
    renderWithProviders(
      <RTLProvider>
        <div data-testid="mixed-content">
          Text content
          {123}
          <span>Span content</span>
          {true && <div>Conditional div</div>}
          {false && <div>Hidden div</div>}
        </div>
      </RTLProvider>
    );

    const container = screen.getByTestId('mixed-content');
    expect(container).toBeInTheDocument();
    expect(container).toHaveTextContent('Text content');
    expect(container).toHaveTextContent('123');
    expect(screen.getByText('Span content')).toBeInTheDocument();
    expect(screen.getByText('Conditional div')).toBeInTheDocument();
    expect(screen.queryByText('Hidden div')).not.toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });

  it('should handle useRTL hook returning values without affecting rendering', async () => {
    // Mock useRTL to return some values (simulating actual RTL logic)
    mockUseRTL.mockImplementation(() => ({
      isRTL: true,
      direction: 'rtl'
    }));
    
    renderWithProviders(
      <RTLProvider>
        <div data-testid="rtl-content">RTL Content</div>
      </RTLProvider>
    );

    expect(screen.getByTestId('rtl-content')).toBeInTheDocument();
    expect(screen.getByText('RTL Content')).toBeInTheDocument();
    expect(mockUseRTL).toHaveBeenCalledTimes(1);
  });
});