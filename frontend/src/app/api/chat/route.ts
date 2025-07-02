import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { v4 as uuidv4 } from 'uuid';

// Initialize storage and AI services only when needed
let storage: Storage | null = null;
let vertexAI: VertexAI | null = null;
let bucket: ReturnType<Storage['bucket']> | null = null;

function initializeServices() {
  if (!storage && process.env.GOOGLE_CLOUD_PROJECT) {
    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    bucket = storage.bucket('ai-square-db');
  }
  
  if (!vertexAI && process.env.GOOGLE_CLOUD_PROJECT) {
    vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
  }
}

interface UserMemory {
  shortTerm: {
    recentActivities: unknown[];
    currentProgress: unknown;
    recentTopics: string[];
    lastUpdated: string;
  };
  longTerm: {
    profile: unknown;
    learningStyle: string;
    achievements: unknown[];
    preferences: unknown;
    lastUpdated: string;
  };
}

async function getUserMemory(userEmail: string): Promise<UserMemory | null> {
  initializeServices();
  if (!bucket) return null;
  
  try {
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
    
    // Load short-term memory
    const shortTermFile = bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
    const longTermFile = bucket.file(`user/${sanitizedEmail}/memory/long_term.json`);
    
    const [shortTermExists] = await shortTermFile.exists();
    const [longTermExists] = await longTermFile.exists();
    
    const memory: UserMemory = {
      shortTerm: {
        recentActivities: [],
        currentProgress: {},
        recentTopics: [],
        lastUpdated: new Date().toISOString()
      },
      longTerm: {
        profile: {},
        learningStyle: '',
        achievements: [],
        preferences: {},
        lastUpdated: new Date().toISOString()
      }
    };
    
    if (shortTermExists) {
      const [shortTermData] = await shortTermFile.download();
      memory.shortTerm = JSON.parse(shortTermData.toString());
    }
    
    if (longTermExists) {
      const [longTermData] = await longTermFile.download();
      memory.longTerm = JSON.parse(longTermData.toString());
    }
    
    return memory;
  } catch (error) {
    console.error('Error loading user memory:', error);
    return null;
  }
}

async function getUserContext(userEmail: string) {
  initializeServices();
  if (!bucket) return null;
  
  const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
  
  try {
    // Load user data
    const userFile = bucket.file(`user/${sanitizedEmail}/user_data.json`);
    const [exists] = await userFile.exists();
    
    if (!exists) {
      return null;
    }
    
    const [data] = await userFile.download();
    const userData = JSON.parse(data.toString());
    
    // Load memory
    const memory = await getUserMemory(userEmail);
    
    // Build context
    const context = {
      identity: userData.identity || 'learner',
      goals: userData.goals || [],
      assessmentScore: userData.assessmentResult?.overallScore || null,
      domainScores: userData.assessmentResult?.domainScores || {},
      weakDomains: Object.entries(userData.assessmentResult?.domainScores || {})
        .filter(([, score]) => typeof score === 'number' && score < 60)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(([domain, _]) => domain),
      recentActivities: memory?.shortTerm.recentActivities || [],
      learningStyle: memory?.longTerm.learningStyle || 'balanced',
      completedPBLs: userData.completedPBLs || [],
      currentProgress: memory?.shortTerm.currentProgress || {}
    };
    
    return context;
  } catch (error) {
    console.error('Error loading user context:', error);
    return null;
  }
}

async function saveMessage(userEmail: string, sessionId: string, message: { role: string; content: string; timestamp: string }) {
  initializeServices();
  if (!bucket) {
    throw new Error('Storage service not initialized');
  }
  
  const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
  const sessionFile = bucket.file(`user/${sanitizedEmail}/chat/sessions/${sessionId}.json`);
  
  try {
    // Load existing session or create new
    const [exists] = await sessionFile.exists();
    let session;
    
    if (exists) {
      const [data] = await sessionFile.download();
      session = JSON.parse(data.toString());
      session.messages.push(message);
      session.last_message = message.content.substring(0, 100);
      session.message_count = session.messages.length;
      session.updated_at = new Date().toISOString();
    } else {
      session = {
        id: sessionId,
        title: 'New Chat', // Will be updated by auto-naming
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [message],
        last_message: message.content.substring(0, 100),
        message_count: 1,
        tags: []
      };
    }
    
    await sessionFile.save(JSON.stringify(session, null, 2));
    
    // Update index
    await updateChatIndex(userEmail, sessionId, session);
    
    return session;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

async function updateChatIndex(userEmail: string, sessionId: string, session: { id: string; title: string; updated_at: string; last_message?: string; message_count?: number; created_at?: string }) {
  initializeServices();
  if (!bucket) {
    throw new Error('Storage service not initialized');
  }
  
  const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
  const indexFile = bucket.file(`user/${sanitizedEmail}/chat/index.json`);
  
  try {
    const [exists] = await indexFile.exists();
    let index: { sessions: Array<{ id: string; title: string; created_at: string; updated_at: string; last_message?: string; message_count?: number }> } = { sessions: [] };
    
    if (exists) {
      const [data] = await indexFile.download();
      index = JSON.parse(data.toString());
    }
    
    // Update or add session info
    const sessionIndex = index.sessions.findIndex((s: { id: string }) => s.id === sessionId);
    const sessionInfo = {
      id: session.id,
      title: session.title,
      created_at: session.created_at || session.updated_at,
      updated_at: session.updated_at,
      last_message: session.last_message,
      message_count: session.message_count
    };
    
    if (sessionIndex >= 0) {
      index.sessions[sessionIndex] = sessionInfo;
    } else {
      index.sessions.unshift(sessionInfo); // Add to beginning
    }
    
    // Sort by updated_at
    index.sessions.sort((a: { updated_at: string }, b: { updated_at: string }) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    
    await indexFile.save(JSON.stringify(index, null, 2));
  } catch (error) {
    console.error('Error updating chat index:', error);
  }
}

async function generateChatTitle(messages: { role: string; content: string }[]) {
  if (messages.length < 2) return 'New Chat';
  
  initializeServices();
  if (!vertexAI) {
    return 'New Chat';
  }
  
  const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 50,
      temperature: 0.7,
    },
  });
  
  // Use up to 3 messages (first 3 exchanges) for better context
  const conversationContext = messages.slice(0, 6) // user, assistant, user (if exists)
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content.substring(0, 150)}`;
    })
    .join('\n');
  
  const prompt = `Based on this conversation, generate a short, descriptive title in Traditional Chinese (max 6 words, 繁體中文):

${conversationContext}

Generate a title that captures the main topic or question. Examples:
- "AI 素養評估討論"
- "機器學習入門指導"
- "程式設計問題解答"
- "職涯發展建議"

Title:`;
  
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '學習討論';
    return text.trim().replace(/['"「」]/g, '');
  } catch (error) {
    console.error('Error generating title:', error);
    return '學習討論';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Initialize services on first request
    initializeServices();
    
    if (!vertexAI || !bucket) {
      return NextResponse.json({ error: 'AI services not configured' }, { status: 503 });
    }
    
    const { message, sessionId } = await req.json();
    
    // Get user info from request (passed from client)
    const userStr = req.headers.get('x-user-info');
    
    if (!userStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userInfo = JSON.parse(userStr);
    const userEmail = userInfo.email;
    
    // Get user context
    const userContext = await getUserContext(userEmail);
    
    if (!userContext) {
      return NextResponse.json({ error: 'User context not found' }, { status: 404 });
    }
    
    // Build system prompt with user context
    const systemPrompt = `You are an AI learning advisor for AI Square platform. You help users with their AI literacy learning journey.

User Profile:
- Identity: ${userContext.identity}
- Learning Goals: ${userContext.goals.join(', ')}
- Overall Assessment Score: ${userContext.assessmentScore}%
- Weak Domains: ${userContext.weakDomains.join(', ')}
- Learning Style: ${userContext.learningStyle}

Your role:
1. Provide personalized learning guidance based on their profile and progress
2. Help them choose appropriate PBL scenarios
3. Offer encouragement and motivation
4. Answer questions about AI concepts
5. Suggest next steps in their learning journey

Guidelines:
- Be supportive and encouraging
- Provide concrete, actionable advice
- Reference their specific assessment results when relevant
- Adapt your communication style to their identity (student, teacher, professional, learner)
- Don't overwhelm with too much information at once
- Use examples relevant to their context`;

    // Generate AI response
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.8,
      },
    });
    
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'ll help guide the user based on their profile and learning progress.' }],
        },
      ],
    });
    
    const result = await chat.sendMessage(message);
    const response = result.response;
    const aiResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I was unable to generate a response.';
    
    // Create or use session ID
    const currentSessionId = sessionId || uuidv4();
    
    // Save messages
    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    const assistantMessage = {
      id: `${Date.now() + 1}-assistant`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      context_used: ['assessment_score', 'user_identity', 'weak_domains']
    };
    
    await saveMessage(userEmail, currentSessionId, userMessage);
    const session = await saveMessage(userEmail, currentSessionId, assistantMessage);
    
    // Auto-generate title for new sessions or update title if still generic
    const shouldGenerateTitle = (
      (!sessionId && session.messages.length === 2) || // New session with first exchange
      (session.title === 'New Chat' && session.messages.length >= 4) // Update generic title after 2 exchanges
    );
    
    if (shouldGenerateTitle) {
      const title = await generateChatTitle(session.messages);
      session.title = title;
      
      // Save updated session with title
      const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
      const sessionFile = bucket.file(`user/${sanitizedEmail}/chat/sessions/${currentSessionId}.json`);
      await sessionFile.save(JSON.stringify(session, null, 2));
      
      // Update index with new title
      await updateChatIndex(userEmail, currentSessionId, session);
    }
    
    // Update short-term memory with recent topic
    await updateShortTermMemory(userEmail, message);
    
    return NextResponse.json({
      response: aiResponse,
      sessionId: currentSessionId,
      title: session.title
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

async function updateShortTermMemory(userEmail: string, message: string) {
  try {
    const memory = await getUserMemory(userEmail) || {
      shortTerm: {
        recentActivities: [],
        currentProgress: {},
        recentTopics: [],
        lastUpdated: new Date().toISOString()
      },
      longTerm: {
        profile: {},
        learningStyle: '',
        achievements: [],
        preferences: {},
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Add to recent topics (keep last 10)
    memory.shortTerm.recentTopics = [
      message.substring(0, 100),
      ...memory.shortTerm.recentTopics
    ].slice(0, 10);
    
    memory.shortTerm.lastUpdated = new Date().toISOString();
    
    // Save updated memory
    if (!bucket) {
      throw new Error('Storage service not initialized');
    }
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
    const shortTermFile = bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
    await shortTermFile.save(JSON.stringify(memory.shortTerm, null, 2));
  } catch (error) {
    console.error('Error updating short-term memory:', error);
  }
}