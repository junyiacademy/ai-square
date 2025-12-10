/**
 * Unit tests for Slack client
 * TDD: Red → Green → Refactor
 */

import { sendToSlack, sendToSlackWithCharts } from '../slack-client';

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

  describe('sendToSlackWithCharts', () => {
    const mockCharts = {
      registrationChart: 'https://quickchart.io/chart?c=registration',
      activeUsersChart: 'https://quickchart.io/chart?c=active',
      completionRateChart: 'https://quickchart.io/chart?c=completion'
    };

    it('should send report with Block Kit image blocks', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      const result = await sendToSlackWithCharts(mockReport, mockCharts);

      // Assert
      expect(result.success).toBe(true);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Verify Block Kit structure: 1 section + 1 divider + 3 headers + 3 images = 8 blocks
      expect(body).toHaveProperty('blocks');
      expect(Array.isArray(body.blocks)).toBe(true);
      expect(body.blocks.length).toBe(8);

      // Verify first block is section with report text
      expect(body.blocks[0].type).toBe('section');
      expect(body.blocks[0].text.type).toBe('mrkdwn');
      expect(body.blocks[0].text.text).toContain('Test report content');

      // Verify second block is divider
      expect(body.blocks[1].type).toBe('divider');

      // Verify remaining blocks are chart headers and images (3 + 3 = 6)
      const chartBlocks = body.blocks.slice(2);
      expect(chartBlocks.length).toBe(6);
    });

    it('should include all three chart images with proper Block Kit format', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      await sendToSlackWithCharts(mockReport, mockCharts);

      // Assert
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Check image blocks
      const imageBlocks = body.blocks.filter(
        (block: Record<string, unknown>) => block.type === 'image'
      );
      expect(imageBlocks).toHaveLength(3);

      // Verify each chart URL is present
      expect(imageBlocks[0].image_url).toBe(mockCharts.registrationChart);
      expect(imageBlocks[1].image_url).toBe(mockCharts.activeUsersChart);
      expect(imageBlocks[2].image_url).toBe(mockCharts.completionRateChart);
    });

    it('should include header blocks with emojis', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      await sendToSlackWithCharts(mockReport, mockCharts);

      // Assert
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Check header blocks
      const headerBlocks = body.blocks.filter(
        (block: Record<string, unknown>) => block.type === 'header'
      );
      expect(headerBlocks).toHaveLength(3);

      expect(headerBlocks[0].text.text).toBe('📈 Daily Registration Trend');
      expect(headerBlocks[1].text.text).toBe('👥 Daily Active Users');
      expect(headerBlocks[2].text.text).toBe('📚 Completions by Mode');
    });

    it('should include alt text for accessibility', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // Act
      await sendToSlackWithCharts(mockReport, mockCharts);

      // Assert
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const imageBlocks = body.blocks.filter(
        (block: Record<string, unknown>) => block.type === 'image'
      );

      expect(imageBlocks[0].alt_text).toBe('Daily Registration Trend Chart');
      expect(imageBlocks[1].alt_text).toBe('Daily Active Users Chart');
      expect(imageBlocks[2].alt_text).toBe(
        'Completion Rate by Mode Chart'
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Act
      const result = await sendToSlackWithCharts(mockReport, mockCharts);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should throw error when webhook URL is not configured', async () => {
      // Arrange
      delete process.env.SLACK_AISQUARE_WEBHOOK_URL;

      // Act & Assert
      await expect(
        sendToSlackWithCharts(mockReport, mockCharts)
      ).rejects.toThrow('Slack webhook URL not configured');
    });
  });
});
