/**
 * Unit tests for EmailService
 * Tests email sending functionality with mocked nodemailer
 */

const originalEnv = { ...process.env };

// Set up environment before any imports
process.env.GMAIL_USER = 'test@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'test-password';

// Mock nodemailer before imports
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail
}));

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport
}));

// Mock console methods to reduce noise
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// Import after mocking
import { emailService } from '../email-service';

describe.skip('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

    // Mock console methods for clean test output
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    Object.assign(console, originalConsole);
  });

  afterAll(() => {
    // Restore original environment
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe('basic functionality', () => {
    it('should send email successfully', async () => {
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
          html: '<p>Test HTML</p>',
          from: '"AI Square" <test@gmail.com>'
        })
      );
    });

    it('should send verification email successfully', async () => {
      const result = await emailService.sendVerificationEmail(
        'user@example.com',
        'https://example.com/verify/token123'
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '【AI Square】請驗證您的電子郵件地址'
        })
      );
    });

    it('should send password reset email successfully', async () => {
      const result = await emailService.sendPasswordResetEmail(
        'user@example.com',
        'https://example.com/reset/token123'
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '【AI Square】重設您的密碼'
        })
      );
    });

    it('should send welcome email successfully', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

      const result = await emailService.sendWelcomeEmail(
        'user@example.com',
        'John Doe'
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '【AI Square】歡迎加入，John Doe！'
        })
      );
    });

    it('should handle send failures gracefully', async () => {
      mockSendMail.mockRejectedValue(new Error('Send failed'));

      const result = await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to send email:',
        expect.any(Error)
      );
    });

    it('should include text version when only HTML provided', async () => {
      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>'
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test HTML',
          html: '<p>Test HTML</p>'
        })
      );
    });

    it('should use provided text when specified', async () => {
      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Custom text version'
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom text version',
          html: '<p>Test HTML</p>'
        })
      );
    });
  });

  describe('HTML to text conversion', () => {
    it('should strip HTML tags from content', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>Title</h1><p>Content with <strong>bold</strong> text</p>'
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Title Content with bold text'
        })
      );
    });

    it('should handle style and script tags', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<style>body{color:red}</style><p>Content</p><script>alert("test")</script>'
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Content'
        })
      );
    });

    it('should handle complex HTML structures', async () => {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: `
          <div class="container">
            <h1>Welcome</h1>
            <div class="content">
              <p>Hello <span>world</span>!</p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
            </div>
          </div>
        `
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Welcome Hello world! Item 1 Item 2')
        })
      );
    });
  });

  describe('email templates', () => {
    it('should include verification URL in verification email', async () => {
      const verificationUrl = 'https://example.com/verify/abc123';

      await emailService.sendVerificationEmail(
        'user@example.com',
        verificationUrl
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(verificationUrl);
      expect(callArgs.html).toContain('驗證電子郵件');
    });

    it('should include reset URL in password reset email', async () => {
      const resetUrl = 'https://example.com/reset/xyz789';

      await emailService.sendPasswordResetEmail(
        'user@example.com',
        resetUrl
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(resetUrl);
      expect(callArgs.html).toContain('重設密碼');
    });

    it('should include user name in welcome email', async () => {
      const userName = 'Alice Wang';

      await emailService.sendWelcomeEmail(
        'alice@example.com',
        userName
      );

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(userName);
      expect(callArgs.html).toContain('歡迎');
      expect(callArgs.subject).toContain(userName);
    });
  });
});
