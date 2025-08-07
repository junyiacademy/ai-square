import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonProps } from '../button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600');
  });

  it('applies different variants correctly', () => {
    const variants: ButtonProps['variant'][] = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
    const expectedClasses = {
      default: 'bg-blue-600',
      destructive: 'bg-red-600',
      outline: 'border-gray-300',
      secondary: 'bg-gray-200',
      ghost: 'hover:bg-gray-100',
      link: 'text-blue-600'
    };

    variants.forEach(variant => {
      const { rerender } = render(<Button variant={variant}>Test</Button>);
      const button = screen.getByRole('button', { name: /test/i });
      expect(button).toHaveClass(expectedClasses[variant as keyof typeof expectedClasses]);
      rerender(<></>);
    });
  });

  it('applies different sizes correctly', () => {
    const sizes: ButtonProps['size'][] = ['default', 'sm', 'lg', 'icon'];
    const expectedClasses = {
      default: 'h-10',
      sm: 'h-9',
      lg: 'h-11',
      icon: 'h-10 w-10'
    };

    sizes.forEach(size => {
      const { rerender } = render(<Button size={size}>Test</Button>);
      const button = screen.getByRole('button', { name: /test/i });
      const expectedClass = expectedClasses[size as keyof typeof expectedClasses];
      expectedClass.split(' ').forEach(cls => {
        expect(button).toHaveClass(cls);
      });
      rerender(<></>);
    });
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    
    expect(button).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Ref Button');
  });

  it('passes through other HTML button props', () => {
    render(
      <Button 
        type="submit" 
        aria-label="Submit form"
        data-testid="submit-btn"
      >
        Submit
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
    expect(button).toHaveAttribute('data-testid', 'submit-btn');
  });

  it('combines variant and size classes correctly', () => {
    render(<Button variant="destructive" size="lg">Large Destructive</Button>);
    const button = screen.getByRole('button', { name: /large destructive/i });
    
    expect(button).toHaveClass('bg-red-600'); // destructive variant
    expect(button).toHaveClass('h-11'); // lg size
  });

  it('maintains focus styles', () => {
    render(<Button>Focus me</Button>);
    const button = screen.getByRole('button', { name: /focus me/i });
    
    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-gray-950');
  });
});