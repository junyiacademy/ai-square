import React from 'react';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from './loading-skeleton';

describe('LoadingSkeleton', () => {
  it('renders skeleton element', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeleton = container.firstChild;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSkeleton className="w-full h-4" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('w-full', 'h-4');
  });

  it('applies default styles', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('bg-gray-200', 'rounded');
  });

  it('can disable animation', () => {
    const { container } = render(<LoadingSkeleton animate={false} />);
    const skeleton = container.firstChild;
    expect(skeleton).not.toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('bg-gray-200', 'rounded');
  });

  it('can render multiple skeletons', () => {
    const { container } = render(
      <div>
        <LoadingSkeleton className="h-4 w-[250px]" />
        <LoadingSkeleton className="h-4 w-[200px]" />
        <LoadingSkeleton className="h-4 w-[150px]" />
      </div>
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });
});