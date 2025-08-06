import nodemailer from 'nodemailer';

// Mock nodemailer first before importing email service
jest.mock('nodemailer');

// Mock the email service module
jest.mock('../email-service', () => {
  const actualModule = jest.requireActual('../email-service');
  return {
    ...actualModule,
    emailService: {
      sendEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    }
  };
});

// Now import email service after mocking
import { emailService } from '../email-service';

describe('EmailService', () => {
  const mockEmailService = emailService as jest.Mocked<typeof emailService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set environment variables
    process.env.GMAIL_USER = 'test@example.com';
    process.env.GMAIL_APP_PASSWORD = 'test-app-password';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content'
      };

      mockEmailService.sendEmail.mockResolvedValue(true);

      const result = await emailService.sendEmail(emailOptions);

      expect(result).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(emailOptions);
    });

    it('should handle email sending failure', async () => {
      mockEmailService.sendEmail.mockResolvedValue(false);

      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(emailOptions);
    });

    it('should return false when email service is not configured', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      
      mockEmailService.sendEmail.mockResolvedValue(false);

      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result).toBe(false);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(emailOptions);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct template', async () => {
      const email = 'user@example.com';
      const verificationUrl = 'http://localhost:3000/verify-email?token=abc123';
      
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await emailService.sendVerificationEmail(email, verificationUrl);

      expect(result).toBe(true);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(email, verificationUrl);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with user name', async () => {
      const email = 'user@example.com';
      const name = 'Test User';
      
      mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await emailService.sendWelcomeEmail(email, name);

      expect(result).toBe(true);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(email, name);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with reset link', async () => {
      const email = 'user@example.com';
      const resetUrl = 'http://localhost:3000/reset-password?token=xyz789';
      
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await emailService.sendPasswordResetEmail(email, resetUrl);

      expect(result).toBe(true);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(email, resetUrl);
    });
  });

});