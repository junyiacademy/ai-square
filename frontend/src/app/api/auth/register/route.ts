import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Mock database - in production, this would be a real database
const USERS_DB: Array<{
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  hasCompletedAssessment: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  registrationSource: string;
  lastLogin: string;
  preferences: {
    language: string;
    theme: string;
  };
  identity?: string;
  lastUpdated?: string;
  lastModified?: string;
  onboarding?: {
    welcomeCompleted: boolean;
    identityCompleted: boolean;
    goalsCompleted: boolean;
    completedAt: string;
    welcomeCompletedAt?: string;
    identityCompletedAt?: string;
    goalsCompletedAt?: string;
  };
  interests?: string[];
  learningGoals?: string[];
  assessmentCompleted?: boolean;
  assessmentCompletedAt?: string;
  assessmentResult?: {
    overallScore: number;
    domainScores: {
      engaging_with_ai: number;
      creating_with_ai: number;
      managing_with_ai: number;
      designing_with_ai: number;
    };
    totalQuestions: number;
    correctAnswers: number;
    timeSpentSeconds: number;
    completedAt: string;
    level: string;
    recommendations?: string[];
  };
}> = [
  {
    id: 1,
    email: 'student@example.com',
    password: 'student123',
    name: 'Student User',
    role: 'student',
    hasCompletedAssessment: false,
    hasCompletedOnboarding: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T14:38:11.656Z',
    preferences: {
      language: 'en',
      theme: 'light'
    }
  },
  {
    id: 2,
    email: 'teacher@example.com',
    password: 'teacher123',
    name: 'Teacher User',
    role: 'teacher',
    hasCompletedAssessment: true,
    hasCompletedOnboarding: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T07:28:38.521Z',
    preferences: {
      language: 'en',
      theme: 'light'
    },
    identity: 'teacher',
    lastUpdated: '2025-07-02T05:06:58.768Z',
    onboarding: {
      welcomeCompleted: true,
      identityCompleted: true,
      goalsCompleted: true,
      completedAt: '2025-07-02T07:27:10.190Z',
      welcomeCompletedAt: '2025-07-02T07:26:22.078Z',
      identityCompletedAt: '2025-07-02T07:27:06.257Z',
      goalsCompletedAt: '2025-07-02T07:27:10.190Z'
    },
    lastModified: '2025-07-02T07:28:29.241Z',
    interests: [
      'analyze-data',
      'create-content'
    ],
    learningGoals: [
      'analyze-data',
      'create-content'
    ],
    assessmentCompleted: true,
    assessmentCompletedAt: '2025-07-02T07:28:29.241Z',
    assessmentResult: {
      overallScore: 42,
      domainScores: {
        engaging_with_ai: 33,
        creating_with_ai: 67,
        managing_with_ai: 33,
        designing_with_ai: 33
      },
      totalQuestions: 12,
      correctAnswers: 5,
      timeSpentSeconds: 27,
      completedAt: '2025-07-02T07:28:25.904Z',
      level: 'beginner',
      recommendations: [
        'Focus on improving Engaging with AI: Understanding AI limitations, privacy concerns, and ethical considerations when interacting with AI systems',
        'Focus on improving Managing with AI: Developing skills for AI-assisted decision making, workflow automation, and team collaboration'
      ]
    }
  },
  {
    id: 3,
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    hasCompletedAssessment: true,
    hasCompletedOnboarding: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T10:00:00.000Z',
    preferences: {
      language: 'en',
      theme: 'light'
    },
    identity: 'educator',
    onboarding: {
      welcomeCompleted: true,
      identityCompleted: true,
      goalsCompleted: true,
      completedAt: '2025-01-15T10:00:00.000Z'
    },
    interests: ['manage-ai', 'ethical-ai'],
    learningGoals: ['manage-ai', 'ethical-ai'],
    assessmentCompleted: true,
    assessmentCompletedAt: '2025-01-15T10:05:00.000Z',
    assessmentResult: {
      overallScore: 92,
      domainScores: {
        engaging_with_ai: 100,
        creating_with_ai: 83,
        managing_with_ai: 100,
        designing_with_ai: 83
      },
      totalQuestions: 12,
      correctAnswers: 11,
      timeSpentSeconds: 180,
      completedAt: '2025-01-15T10:05:00.000Z',
      level: 'advanced'
    }
  },
  {
    id: 4,
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'student',
    hasCompletedAssessment: false,
    hasCompletedOnboarding: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    registrationSource: 'web',
    lastLogin: '2025-07-02T14:38:11.656Z',
    preferences: {
      language: 'en',
      theme: 'light'
    }
  }
];

// Simple ID generator
let nextUserId = 5;

// Initialize GCS
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db';
const bucket = storage.bucket(BUCKET_NAME);

// Function to save user data to GCS
async function saveUserToGCS(userData: { email: string; password: string; name?: string; role?: string; id?: string | number }) {
  const sanitizedEmail = userData.email.replace('@', '_at_').replace(/\./g, '_');
  const filePath = `user/${sanitizedEmail}/user_data.json`;
  const file = bucket.file(filePath);
  
  const userDataToSave = {
    ...userData,
    registrationSource: 'web',
    lastLogin: new Date().toISOString(),
    preferences: {
      language: 'en',
      theme: 'light'
    }
  };
  
  try {
    await file.save(JSON.stringify(userDataToSave, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    console.log(`✅ User data saved to GCS: ${filePath}`);
  } catch (error) {
    console.error('❌ Error saving user to GCS:', error);
    // Don't throw - allow registration to continue even if GCS fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check password length
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = USERS_DB.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = {
      id: nextUserId++,
      email,
      password, // In production, this should be hashed
      name,
      role: 'student', // Default role
      hasCompletedAssessment: false,
      hasCompletedOnboarding: false,
      createdAt: new Date().toISOString()
    };

    // Add to mock database
    USERS_DB.push(newUser);

    // Save to GCS (including password for now - in production should be hashed)
    await saveUserToGCS(newUser);

    // Return success (without password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}