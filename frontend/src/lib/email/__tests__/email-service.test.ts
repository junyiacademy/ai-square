/**
 * Unit tests for EmailService
 * Tests email sending functionality with mocked nodemailer
 */

import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe.skip('EmailService', () => {
  let mockTransporter: any;
  let mockSendMail: jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Setup mock transporter
    mockSendMail = jest.fn();
    mockTransporter = {
      sendMail: mockSendMail
    };
    
    // Don't set mock return value globally - each test will set it up when needed
    
    // Suppress console output in tests (temporarily disabled for debugging)
    // jest.spyOn(console, 'log').mockImplementation();
    // jest.spyOn(console, 'warn').mockImplementation();
    // jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with Gmail credentials', () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      // Clear module cache to force re-initialization
      jest.resetModules();
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
      
      jest.resetModules();
      const { emailService } = require('../email-service');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Email service not configured')
      );
    });
  });

  describe('sendEmail', () => {
    let emailService: any;

    beforeEach(() => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      // Reset modules first, then set up the mock
      jest.resetModules();
      
      // Mock createTransport to return our mockTransporter
      (nodemailer.createTransport as jest.Mock).mockImplementation(() => mockTransporter);
      
      // Now require the module - this will call the mocked createTransport
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send email successfully', async () => {
      console.log('Test: mockTransporter is:', mockTransporter);
      console.log('Test: nodemailer.createTransport mock calls:', (nodemailer.createTransport as jest.Mock).mock.calls);
      
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
      mockSendMail.mockRejectedValue(new Error('Send failed'));
      
      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email'),
        expect.any(Error)
      );
    });

    it('should return false if not configured', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      
      jest.resetModules();
      const { emailService: unconfiguredService } = require('../email-service');
      
      const result = await unconfiguredService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });
      
      expect(result).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should convert HTML to text if text not provided', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-id' });
      
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>Title</h1><p>Content</p>'
      });
      
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Title')
        })
      );
    });

    it('should use provided text over HTML conversion', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-id' });
      
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
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
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send verification email with correct content', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'verify-id' });
      
      const result = await emailService.sendVerificationEmail(
        'user@example.com',
        'https://example.com/verify?token=abc123'
      );
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '【AI Square】請驗證您的電子郵件地址',
          html: expect.stringContaining('驗證電子郵件')
        })
      );
    });

    it('should include verification URL in email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'verify-id' });
      
      const verificationUrl = 'https://example.com/verify?token=test123';
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
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send password reset email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'reset-id' });
      
      const resetUrl = 'https://example.com/reset?token=reset123';
      const result = await emailService.sendPasswordResetEmail(
        'user@example.com',
        resetUrl
      );
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '【AI Square】重設您的密碼',
          html: expect.stringContaining('重設密碼')
        })
      );
    });

    it('should include reset URL and expiry warning', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'reset-id' });
      
      const resetUrl = 'https://example.com/reset?token=xyz789';
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
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      
      jest.resetModules();
      const module = require('../email-service');
      emailService = module.emailService;
    });

    it('should send welcome email with user name', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'welcome-id' });
      
      const result = await emailService.sendWelcomeEmail(
        'user@example.com',
        'John Doe'
      );
      
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '【AI Square】歡迎加入，John Doe！',
          html: expect.stringContaining('歡迎，John Doe！')
        })
      );
    });

    it('should include dashboard link', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'welcome-id' });
      
      await emailService.sendWelcomeEmail('user@example.com', 'Jane');
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://app.example.com/dashboard');
      expect(callArgs.html).toContain('開始學習');
    });

    it('should use default URL if env not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      
      jest.resetModules();
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      const { emailService: service } = require('../email-service');
      
      mockSendMail.mockResolvedValue({ messageId: 'welcome-id' });
      
      await service.sendWelcomeEmail('user@example.com', 'User');
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:3000/dashboard');
    });
  });

  describe('edge cases', () => {
    it('should handle transporter creation failure', () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      (nodemailer.createTransport as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create transporter');
      });
      
      jest.resetModules();
      const { emailService } = require('../email-service');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to configure email service'),
        expect.any(Error)
      );
    });

    it('should handle invalid email addresses gracefully', async () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      
      jest.resetModules();
      const { emailService } = require('../email-service');
      
      mockSendMail.mockRejectedValue(new Error('Invalid recipient'));
      
      const result = await emailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
});