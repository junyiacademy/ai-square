/**
 * Unit tests for EmailService
 * Tests email sending functionality with mocked nodemailer
 */

import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let mockTransporter: any;
  let mockSendMail: jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Setup mock transporter with sendMail method
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter = {
      sendMail: mockSendMail
    };
    
    // Setup default mock for createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with Gmail credentials', () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      const { emailService } = require('../email-service');
      
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@gmail.com',
          pass: 'test-password'
        }
      });
    });

    it('should warn if credentials are missing', () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      jest.resetModules();
      
      // Re-setup the mock after resetModules
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const { emailService } = require('../email-service');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email service not configured')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendEmail', () => {
    let emailService: any;

    beforeEach(() => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      jest.resetModules();
      
      // Mock createTransport to return our mockTransporter AFTER resetModules
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send email successfully', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"AI Square" <test@gmail.com>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: expect.any(String)
      });
    });

    it('should handle send failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSendMail.mockRejectedValue(new Error('Send failed'));
      
      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should convert HTML to text if text not provided', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Title</h1><p>Content</p>'
      });
      
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Title')
        })
      );
    });

    it('should use provided text over HTML conversion', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>HTML Title</h1>',
        text: 'Custom Text'
      });
      
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom Text'
        })
      );
    });
  });

  describe('sendVerificationEmail', () => {
    let emailService: any;

    beforeEach(() => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      jest.resetModules();
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send verification email with correct content', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      const verificationUrl = 'https://example.com/verify/token123';
      const result = await emailService.sendVerificationEmail(
        'user@example.com',
        verificationUrl
      );
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.any(String),
          html: expect.stringContaining(verificationUrl)
        })
      );
    });

    it('should include verification URL in email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      const verificationUrl = 'https://example.com/verify/token456';
      await emailService.sendVerificationEmail('user@example.com', verificationUrl);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(verificationUrl);
      expect(callArgs.html).toContain('24 小時後失效');
    });
  });

  describe('sendPasswordResetEmail', () => {
    let emailService: any;

    beforeEach(() => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      jest.resetModules();
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send password reset email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      const resetUrl = 'https://example.com/reset/token123';
      const result = await emailService.sendPasswordResetEmail(
        'user@example.com',
        resetUrl
      );
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('密碼重置')
        })
      );
    });

    it('should include reset URL and expiry warning', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      const resetUrl = 'https://example.com/reset/token456';
      await emailService.sendPasswordResetEmail('user@example.com', resetUrl);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(resetUrl);
      expect(callArgs.html).toContain('1 小時後失效');
    });
  });

  describe('sendWelcomeEmail', () => {
    let emailService: any;

    beforeEach(() => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://app.example.com';
      
      jest.resetModules();
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send welcome email with user name', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      const result = await emailService.sendWelcomeEmail(
        'user@example.com',
        'John Doe'
      );
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('歡迎'),
          html: expect.stringContaining('John Doe')
        })
      );
    });

    it('should include dashboard link', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      await emailService.sendWelcomeEmail('user@example.com', 'Jane');
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://app.example.com/dashboard');
      expect(callArgs.html).toContain('開始學習');
    });

    it('should use default URL if env not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      
      jest.resetModules();
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const module = require('../email-service');
      const service = module.emailService;
      
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
      
      await service.sendWelcomeEmail('user@example.com', 'User');
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:3000/dashboard');
    });
  });

  describe('edge cases', () => {
    it('should handle transporter creation failure', () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      jest.resetModules();
      
      // Setup mock after resetModules
      (nodemailer.createTransport as jest.Mock).mockImplementation(() => {
        throw new Error('Transport creation failed');
      });
      
      const { emailService } = require('../email-service');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to configure email service'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid email addresses gracefully', async () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      jest.resetModules();
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const module = require('../email-service');
      const emailService = module.emailService;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSendMail.mockRejectedValue(new Error('Invalid email'));
      
      const result = await emailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});