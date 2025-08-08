/**
 * Unit tests for EmailService
 * Tests email sending functionality with mocked nodemailer
 */

// Mock console methods to avoid noise
const consoleSpy = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.spyOn(console, 'log').mockImplementation(consoleSpy.log);
jest.spyOn(console, 'warn').mockImplementation(consoleSpy.warn);
jest.spyOn(console, 'error').mockImplementation(consoleSpy.error);

// Mock nodemailer
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail
  }))
}));

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    
    // Set up environment for successful configuration
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should send email successfully', async () => {
      const { emailService } = require('../email-service');
      
      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(true);
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
    });
  });
});