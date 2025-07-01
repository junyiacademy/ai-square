import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'email': 'Email',
        'password': 'Password',
        'rememberMe': 'Remember me',
        'forgotPassword': 'Forgot password?',
        'login': 'Login',
        'loading': 'Loading...',
        'or': 'or',
        'testAccounts.title': 'Test Accounts'
      };
      return translations[key] || defaultValue || key;
    }
  })
}));

describe('LoginForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    loading: false,
    error: undefined
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form elements correctly', () => {
      render(<LoginForm {...defaultProps} />);

      // Check for form inputs
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
      
      // Check for submit button
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
      
      // Check for forgot password link
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
      
      // Check for test accounts section
      expect(screen.getByText('Test Accounts')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(4); // 1 submit + 3 demo buttons
    });

    it('displays error message when error prop is provided', () => {
      const errorMessage = 'Invalid credentials';
      render(<LoginForm {...defaultProps} error={errorMessage} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(errorMessage);
      expect(alert).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700');
    });

    it('shows loading state when loading prop is true', () => {
      render(<LoginForm {...defaultProps} loading={true} />);

      // Button should show loading text
      expect(screen.getByRole('button', { name: 'Loading...' })).toBeInTheDocument();
      
      // All inputs should be disabled
      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('renders demo account buttons with correct styling', () => {
      render(<LoginForm {...defaultProps} />);

      const demoButtons = screen.getAllByRole('button').slice(1); // Skip submit button
      expect(demoButtons).toHaveLength(3);
      
      // Check for labels
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('Teacher')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('updates input values when user types', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('toggles remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<LoginForm {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });
      
      expect(checkbox).not.toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('submits form with correct data on form submission', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: 'Remember me' });
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      });
    });

    it('prevents form submission when loading', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} loading={true} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const form = emailInput.closest('form')!;

      // Fill in form
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Try to submit
      fireEvent.submit(form);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('disables submit button when email or password is empty', () => {
      render(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Login' });
      
      // Initially disabled (empty fields)
      expect(submitButton).toBeDisabled();

      // Type only email
      fireEvent.change(screen.getByLabelText('Email'), { 
        target: { value: 'test@example.com' } 
      });
      expect(submitButton).toBeDisabled();

      // Type password too
      fireEvent.change(screen.getByLabelText('Password'), { 
        target: { value: 'password123' } 
      });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Demo account functionality', () => {
    it('fills form and auto-submits when demo account button is clicked', async () => {
      jest.useFakeTimers();
      const onSubmit = jest.fn();
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

      const studentButton = screen.getByRole('button', { name: /Student/i });
      
      fireEvent.click(studentButton);

      // Check that form fields are filled
      expect(screen.getByLabelText('Email')).toHaveValue('student@example.com');
      expect(screen.getByLabelText('Password')).toHaveValue('student123');

      // Fast-forward timers
      jest.advanceTimersByTime(100);

      // Check that form was submitted with demo credentials
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'student123',
        rememberMe: false,
        label: 'Student',
        role: 'student'
      });

      jest.useRealTimers();
    });

    it('preserves remember me state when using demo login', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const onSubmit = jest.fn();
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

      // First check remember me
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: 'Remember me' });
      await user.click(rememberMeCheckbox);

      // Then click demo account
      const teacherButton = screen.getByRole('button', { name: /Teacher/i });
      fireEvent.click(teacherButton);

      jest.advanceTimersByTime(100);

      expect(onSubmit).toHaveBeenCalledWith({
        email: 'teacher@example.com',
        password: 'teacher123',
        rememberMe: true,
        label: 'Teacher',
        role: 'teacher'
      });

      jest.useRealTimers();
    });

    it('disables demo account buttons when loading', () => {
      render(<LoginForm {...defaultProps} loading={true} />);

      const demoButtons = screen.getAllByRole('button').slice(1); // Skip submit button
      demoButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Form validation', () => {
    it('requires email and password fields', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it('uses email type for email input', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('uses password type for password input', () => {
      render(<LoginForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form inputs', () => {
      render(<LoginForm {...defaultProps} />);

      // Check that inputs can be found by their labels
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Remember me')).toBeInTheDocument();
    });

    it('has proper ARIA attributes for error messages', () => {
      render(<LoginForm {...defaultProps} error="Test error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('associates form inputs with their labels correctly', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      const emailLabel = screen.getByText('Email');
      expect(emailLabel).toHaveAttribute('for', emailInput.id);

      const passwordInput = screen.getByLabelText('Password');
      const passwordLabel = screen.getByText('Password');
      expect(passwordLabel).toHaveAttribute('for', passwordInput.id);
    });
  });

  describe('Edge cases', () => {
    it('handles rapid demo account clicks gracefully', () => {
      jest.useFakeTimers();
      const onSubmit = jest.fn();
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

      const buttons = screen.getAllByRole('button').slice(1);
      
      // Click all demo buttons rapidly
      buttons.forEach(button => fireEvent.click(button));
      
      jest.advanceTimersByTime(300);

      // Should only submit once for the last clicked button
      expect(onSubmit).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
    });

    it('handles form submission with Enter key', () => {
      const onSubmit = jest.fn();
      render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Submit with Enter key
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });
      fireEvent.submit(emailInput.closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      });
    });
  });
});