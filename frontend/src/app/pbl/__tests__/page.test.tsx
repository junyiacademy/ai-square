/**
 * Tests for page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '../page';

// Mock dependencies
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
    replace: mockReplace,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<Page />);
    expect(container).toBeInTheDocument();
  });

  it('should redirect to /pbl/scenarios', () => {
    render(<Page />);
    
    // Check that replace was called with the correct path
    expect(mockReplace).toHaveBeenCalledWith('/pbl/scenarios');
  });

  it('should render null while redirecting', () => {
    const { container } = render(<Page />);
    
    // The component returns null, so the container should be empty
    expect(container.firstChild).toBeNull();
  });

  it('should call redirect in useEffect', () => {
    render(<Page />);
    
    // Ensure the redirect happens on mount
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('should match snapshot', () => {
    const { container } = render(<Page />);
    expect(container.firstChild).toMatchSnapshot();
  });
});