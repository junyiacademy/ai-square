const fs = require('fs');
const path = require('path');

// Test files to create
const tests = [
  {
    file: 'src/components/ui/button.test.tsx',
    content: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled').closest('button');
    expect(button).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText('Primary').closest('button');
    expect(button).toHaveClass('primary');
  });

  it('applies size classes', () => {
    render(<Button size="large">Large</Button>);
    const button = screen.getByText('Large').closest('button');
    expect(button).toHaveClass('large');
  });

  it('renders as different element with asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByText('Link Button');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });
});`
  },
  {
    file: 'src/components/ui/card.test.tsx',
    content: `import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies className', () => {
      render(<Card className="custom-class">Card</Card>);
      expect(screen.getByText('Card').parentElement).toHaveClass('custom-class');
    });
  });

  describe('CardHeader', () => {
    it('renders header content', () => {
      render(<CardHeader>Header</CardHeader>);
      expect(screen.getByText('Header')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('renders title as h3', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('CardDescription', () => {
    it('renders description text', () => {
      render(<CardDescription>Description</CardDescription>);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('renders content', () => {
      render(<CardContent>Content</CardContent>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders footer content', () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
  });
});`
  },
  {
    file: 'src/components/ui/badge.test.tsx',
    content: `import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('default');
  });

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText('Secondary');
    expect(badge).toHaveClass('secondary');
  });

  it('applies destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveClass('destructive');
  });

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge).toHaveClass('outline');
  });

  it('combines custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('custom-badge');
  });
});`
  },
  {
    file: 'src/components/ui/loading-spinner.test.tsx',
    content: `import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './loading-spinner';

describe('LoadingSpinner', () => {
  it('renders spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    const spinner = container.firstChild;
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    const spinner = container.firstChild;
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstChild;
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});`
  },
  {
    file: 'src/components/ui/loading-skeleton.test.tsx',
    content: `import React from 'react';
import { render } from '@testing-library/react';
import { Skeleton } from './loading-skeleton';

describe('Skeleton', () => {
  it('renders skeleton element', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="w-full h-4" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('w-full', 'h-4');
  });

  it('applies default styles', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('bg-gray-200', 'rounded');
  });

  it('can render multiple skeletons', () => {
    const { container } = render(
      <div>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });
});`
  }
];

// Create test files
tests.forEach(({ file, content }) => {
  const fullPath = path.join(__dirname, file);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Created: ${file}`);
});

console.log(`\nCreated ${tests.length} UI component test files.`);