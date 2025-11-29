import React from 'react';
import { render, screen } from '@testing-library/react';
import { SaveMessage } from '../SaveMessage';

describe('SaveMessage', () => {
  it('renders success message with correct styling', () => {
    const { container } = render(<SaveMessage type="success" text="Results saved successfully" />);

    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toHaveClass('bg-green-50');
    expect(messageDiv).toHaveClass('border-green-200');
  });

  it('renders error message with correct styling', () => {
    const { container } = render(<SaveMessage type="error" text="Failed to save" />);

    const messageDiv = container.firstChild as HTMLElement;
    expect(messageDiv).toHaveClass('bg-red-50');
    expect(messageDiv).toHaveClass('border-red-200');
  });

  it('displays the provided text', () => {
    render(<SaveMessage type="success" text="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });
});
