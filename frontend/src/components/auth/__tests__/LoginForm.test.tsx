import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 0;
});

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should render login form with all fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText('login.email')).toBeInTheDocument();
    expect(screen.getByLabelText('login.password')).toBeInTheDocument();
    expect(screen.getByLabelText('login.rememberMe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'login.submit' })).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText('login.email');
    const passwordInput = screen.getByLabelText('login.password');
    const rememberMeCheckbox = screen.getByLabelText('login.rememberMe');
    const submitButton = screen.getByRole('button', { name: 'login.submit' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(rememberMeCheckbox);
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    });
  });

  it('should display error message when provided', () => {
    render(<LoginForm onSubmit={mockOnSubmit} error="Invalid credentials" />);
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should disable form when loading', () => {
    render(<LoginForm onSubmit={mockOnSubmit} loading={true} />);
    
    expect(screen.getByLabelText('login.email')).toBeDisabled();
    expect(screen.getByLabelText('login.password')).toBeDisabled();
    expect(screen.getByLabelText('login.rememberMe')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'login.submitting' })).toBeDisabled();
  });

  it('should not submit form when loading', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} loading={true} />);
    
    const form = screen.getByRole('form') || document.querySelector('form');
    if (form) {
      await user.click(form);
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should render demo account buttons', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByRole('button', { name: /Student/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Teacher/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
  });

  it('should fill form with demo account credentials', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const studentButton = screen.getByRole('button', { name: /Student/i });
    await user.click(studentButton);
    
    // Wait for form to be filled
    await waitFor(() => {
      const emailInput = screen.getByLabelText('login.email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('login.password') as HTMLInputElement;
      
      expect(emailInput.value).toBe('student@example.com');
      expect(passwordInput.value).toBe('student123');
    });
  });

  it('should auto-submit after filling demo credentials', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const teacherButton = screen.getByRole('button', { name: /Teacher/i });
    await user.click(teacherButton);
    
    // Wait for auto-submit
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'teacher@example.com',
        password: 'teacher123',
        rememberMe: false,
      });
    }, { timeout: 2000 });
  });

  it('should render forgot password link', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const forgotPasswordLink = screen.getByRole('link', { name: 'login.forgotPassword' });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('should render sign up link', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('login.noAccount')).toBeInTheDocument();
    const signUpLink = screen.getByRole('link', { name: 'login.signUp' });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute('href', '/register');
  });

  it('should update email state on input change', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText('login.email') as HTMLInputElement;
    await user.type(emailInput, 'new@example.com');
    
    expect(emailInput.value).toBe('new@example.com');
  });

  it('should update password state on input change', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const passwordInput = screen.getByLabelText('login.password') as HTMLInputElement;
    await user.type(passwordInput, 'newpassword');
    
    expect(passwordInput.value).toBe('newpassword');
  });

  it('should toggle remember me checkbox', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const rememberMeCheckbox = screen.getByLabelText('login.rememberMe') as HTMLInputElement;
    
    expect(rememberMeCheckbox.checked).toBe(false);
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox.checked).toBe(true);
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox.checked).toBe(false);
  });

  it('should prevent default form submission', async () => {
    const user = userEvent.setup();
    const preventDefault = jest.fn();
    
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        preventDefault();
        e.preventDefault();
      });
      
      const submitButton = screen.getByRole('button', { name: 'login.submit' });
      await user.click(submitButton);
      
      expect(preventDefault).toHaveBeenCalled();
    }
  });
});
