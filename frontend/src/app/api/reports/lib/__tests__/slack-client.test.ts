/**
 * Unit tests for Slack client
 * TDD: Red → Green → Refactor
 */

import { sendToSlack } from '../slack-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('Slack Client', () => {
  const mockWebhookUrl = 'https://hooks.slack.com/services/TEST/WEBHOOK/URL';
  const mockReport = '📊 **AI Square 週報**\n\nTest report content';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SLACK_AISQUARE_WEBHOOK_URL = mockWebhookUrl;
  });

  afterEach(() => {
    delete process.env.SLACK_AISQUARE_WEBHOOK_URL;
  });

  describe('sendToSlack', () => {
    it('should send report to Slack successfully', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      const result = await sendToSlack(mockReport);

      // Assert
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        mockWebhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.text).toContain('📊 **AI Square 週報**');
    });

    it('should send report with correct Slack message format', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      await sendToSlack(mockReport);

      // Assert
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toHaveProperty('text', mockReport);
      expect(body).toHaveProperty('mrkdwn', true);
    });

    it('should handle fetch errors gracefully', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Act
      const result = await sendToSlack(mockReport);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle non-ok HTTP responses', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      // Act
      const result = await sendToSlack(mockReport);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bad Request');
    });

    it('should throw error when webhook URL is not configured', async () => {
      // Arrange
      delete process.env.SLACK_AISQUARE_WEBHOOK_URL;

      // Act & Assert
      await expect(sendToSlack(mockReport)).rejects.toThrow(
        'Slack webhook URL not configured'
      );
    });

    it('should fallback to alternative webhook URL', async () => {
      // Arrange
      delete process.env.SLACK_AISQUARE_WEBHOOK_URL;
      const altWebhookUrl = 'https://hooks.slack.com/services/ALT/WEBHOOK';
      process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL = altWebhookUrl;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      await sendToSlack(mockReport);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        altWebhookUrl,
        expect.any(Object)
      );

      delete process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL;
    });

    it('should return success status on successful send', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      const result = await sendToSlack(mockReport);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Report sent to Slack successfully'
      });
    });
  });
});
