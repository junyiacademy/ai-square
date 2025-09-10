/**
 * Unit tests for EmailService
 * Tests email sending functionality with mocked nodemailer
 */

// Mock nodemailer before imports
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail
  }))
}));

// Mock console methods to avoid noise
const consoleSpy = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.spyOn(console, 'log').mockImplementation(consoleSpy.log);
jest.spyOn(console, 'warn').mockImplementation(consoleSpy.warn);
jest.spyOn(console, 'error').mockImplementation(consoleSpy.error);

describe.skip('EmailService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    
    // Reset and set up environment for successful configuration
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
    jest.restoreAllMocks();
  });

  describe.skip('basic functionality', () => {
    it('should send email successfully', async () => {
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>'
        })
      );
    });

    it('should send verification email successfully', async () => {
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendVerificationEmail(
        'user@example.com',
        'https://example.com/verify/token123'
      );
      
      expect(result).toBe(true);
    });

    it('should send password reset email successfully', async () => {
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendPasswordResetEmail(
        'user@example.com',
        'https://example.com/reset/token123'
      );
      
      expect(result).toBe(true);
    });

    it('should send welcome email successfully', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendWelcomeEmail(
        'user@example.com',
        'John Doe'
      );
      
      expect(result).toBe(true);
    });

    it('should handle send failures gracefully', async () => {
      mockSendMail.mockRejectedValue(new Error('Send failed'));
      
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[EmailService] Failed to send email'),
        expect.any(Error)
      );
    });

    it('should return false when service not configured', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      
      jest.resetModules();
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      expect(result).toBe(false);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[EmailService] Email service not configured'
      );
    });
  });
});