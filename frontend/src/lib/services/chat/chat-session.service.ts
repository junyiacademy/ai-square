/**
 * ChatSessionService
 * Manages chat session creation, retrieval, and message saving
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context_used?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  last_message: string;
  message_count: number;
  tags: string[];
}

interface ChatIndex {
  sessions: Array<{
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    last_message?: string;
    message_count?: number;
  }>;
}

export class ChatSessionService {
  constructor(
    private bucket: {
      file: (path: string) => {
        exists: () => Promise<[boolean]>;
        download: () => Promise<[Buffer]>;
        save: (data: string) => Promise<void>;
      };
    },
  ) {}

  /**
   * Sanitize email for file path
   */
  private sanitizeEmail(email: string): string {
    return email.replace("@", "_at_").replace(/\./g, "_");
  }

  /**
   * Create new chat session with first message
   */
  async createSession(
    userEmail: string,
    sessionId: string,
    message: ChatMessage,
  ): Promise<ChatSession> {
    const sanitizedEmail = this.sanitizeEmail(userEmail);
    const sessionFile = this.bucket.file(
      `user/${sanitizedEmail}/chat/sessions/${sessionId}.json`,
    );

    const session: ChatSession = {
      id: sessionId,
      title: "New Chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [message],
      last_message: message.content.substring(0, 100),
      message_count: 1,
      tags: [],
    };

    await sessionFile.save(JSON.stringify(session, null, 2));
    await this.updateChatIndex(userEmail, sessionId, session);

    return session;
  }

  /**
   * Get existing chat session
   */
  async getSession(
    userEmail: string,
    sessionId: string,
  ): Promise<ChatSession | null> {
    try {
      const sanitizedEmail = this.sanitizeEmail(userEmail);
      const sessionFile = this.bucket.file(
        `user/${sanitizedEmail}/chat/sessions/${sessionId}.json`,
      );

      const [exists] = await sessionFile.exists();
      if (!exists) {
        return null;
      }

      const [data] = await sessionFile.download();
      return JSON.parse(data.toString()) as ChatSession;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  /**
   * Add message to existing session or create new session
   */
  async addMessage(
    userEmail: string,
    sessionId: string,
    message: ChatMessage,
  ): Promise<ChatSession> {
    const existingSession = await this.getSession(userEmail, sessionId);

    if (existingSession) {
      // Update existing session
      existingSession.messages.push(message);
      existingSession.last_message = message.content.substring(0, 100);
      existingSession.message_count = existingSession.messages.length;
      existingSession.updated_at = new Date().toISOString();

      const sanitizedEmail = this.sanitizeEmail(userEmail);
      const sessionFile = this.bucket.file(
        `user/${sanitizedEmail}/chat/sessions/${sessionId}.json`,
      );
      await sessionFile.save(JSON.stringify(existingSession, null, 2));
      await this.updateChatIndex(userEmail, sessionId, existingSession);

      return existingSession;
    } else {
      // Create new session
      return this.createSession(userEmail, sessionId, message);
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(
    userEmail: string,
    sessionId: string,
    title: string,
  ): Promise<ChatSession | null> {
    const session = await this.getSession(userEmail, sessionId);

    if (!session) {
      return null;
    }

    session.title = title;
    session.updated_at = new Date().toISOString();

    const sanitizedEmail = this.sanitizeEmail(userEmail);
    const sessionFile = this.bucket.file(
      `user/${sanitizedEmail}/chat/sessions/${sessionId}.json`,
    );
    await sessionFile.save(JSON.stringify(session, null, 2));
    await this.updateChatIndex(userEmail, sessionId, session);

    return session;
  }

  /**
   * Update chat index with session info
   */
  async updateChatIndex(
    userEmail: string,
    sessionId: string,
    session: ChatSession,
  ): Promise<void> {
    try {
      const sanitizedEmail = this.sanitizeEmail(userEmail);
      const indexFile = this.bucket.file(
        `user/${sanitizedEmail}/chat/index.json`,
      );

      const [exists] = await indexFile.exists();
      let index: ChatIndex = { sessions: [] };

      if (exists) {
        const [data] = await indexFile.download();
        index = JSON.parse(data.toString()) as ChatIndex;
      }

      // Update or add session info
      const sessionIndex = index.sessions.findIndex((s) => s.id === sessionId);
      const sessionInfo = {
        id: session.id,
        title: session.title,
        created_at: session.created_at || session.updated_at,
        updated_at: session.updated_at,
        last_message: session.last_message,
        message_count: session.message_count,
      };

      if (sessionIndex >= 0) {
        index.sessions[sessionIndex] = sessionInfo;
      } else {
        index.sessions.unshift(sessionInfo); // Add to beginning
      }

      // Sort by updated_at (descending)
      index.sessions.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

      await indexFile.save(JSON.stringify(index, null, 2));
    } catch (error) {
      console.error("Error updating chat index:", error);
    }
  }
}
