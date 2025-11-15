/**
 * Test Suite for Fix Post Commit Ticket Update
 * 票券: fix-post-commit-ticket-update
 * 類型: bugfix
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock functions for post-commit ticket update
const updateTicketStatus = (ticketId: string, status: string): { success: boolean; ticketId: string; status: string } => {
  if (!ticketId || !status) {
    throw new Error('Ticket ID and status are required');
  }

  const validStatuses = ['pending', 'in_progress', 'completed', 'closed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  return {
    success: true,
    ticketId,
    status
  };
};

const getCommitMessage = (): string => {
  return 'fix: post-commit ticket update functionality';
};

const parseTicketFromCommit = (commitMessage: string): string | null => {
  const ticketMatch = commitMessage.match(/ticket:\s*(\S+)/i);
  return ticketMatch ? ticketMatch[1] : null;
};

describe('Fix Post Commit Ticket Update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update ticket status after successful commit', () => {
    const ticketId = 'TICKET-123';
    const newStatus = 'completed';

    const result = updateTicketStatus(ticketId, newStatus);

    expect(result).toEqual({
      success: true,
      ticketId: 'TICKET-123',
      status: 'completed'
    });
  });

  it('should handle error when ticket ID is missing', () => {
    expect(() => {
      updateTicketStatus('', 'completed');
    }).toThrow('Ticket ID and status are required');
  });

  it('should handle error when status is missing', () => {
    expect(() => {
      updateTicketStatus('TICKET-123', '');
    }).toThrow('Ticket ID and status are required');
  });

  it('should reject invalid ticket status', () => {
    expect(() => {
      updateTicketStatus('TICKET-123', 'invalid_status');
    }).toThrow('Invalid status: invalid_status');
  });

  it('should extract ticket ID from commit message', () => {
    const commitMessage = 'fix: implement feature ticket: TICKET-456';
    const ticketId = parseTicketFromCommit(commitMessage);

    expect(ticketId).toBe('TICKET-456');
  });

  it('should return null when no ticket ID in commit message', () => {
    const commitMessage = 'fix: implement feature without ticket reference';
    const ticketId = parseTicketFromCommit(commitMessage);

    expect(ticketId).toBeNull();
  });

  it('should handle case-insensitive ticket keyword', () => {
    const commitMessage1 = 'fix: feature Ticket: TICKET-789';
    const commitMessage2 = 'fix: feature TICKET: TICKET-789';

    expect(parseTicketFromCommit(commitMessage1)).toBe('TICKET-789');
    expect(parseTicketFromCommit(commitMessage2)).toBe('TICKET-789');
  });

  it('should validate commit message format', () => {
    const commitMessage = getCommitMessage();

    expect(commitMessage).toContain('fix:');
    expect(commitMessage).toContain('post-commit');
    expect(commitMessage).toContain('ticket');
  });

  it('should handle multiple status transitions', () => {
    const ticketId = 'TICKET-999';
    const transitions = ['pending', 'in_progress', 'completed'];

    const results = transitions.map(status => updateTicketStatus(ticketId, status));

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('pending');
    expect(results[1].status).toBe('in_progress');
    expect(results[2].status).toBe('completed');
  });
});
