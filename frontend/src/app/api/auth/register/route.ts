import { NextRequest, NextResponse } from 'next/server';

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
}> = [
  {
    id: 1,
    email: 'student@example.com',
    password: 'student123',
    role: 'student',
    name: 'Student User',
    hasCompletedAssessment: false,
    hasCompletedOnboarding: false,
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 2,
    email: 'teacher@example.com',
    password: 'teacher123',
    role: 'teacher',
    name: 'Teacher User',
    hasCompletedAssessment: true,
    hasCompletedOnboarding: true,
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 3,
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User',
    hasCompletedAssessment: true,
    hasCompletedOnboarding: true,
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 4,
    email: 'test@example.com',
    password: 'password123',
    role: 'student',
    name: 'Test User',
    hasCompletedAssessment: false,
    hasCompletedOnboarding: false,
    createdAt: new Date('2024-01-01').toISOString()
  }
];

// Simple ID generator
let nextUserId = 5;

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

    // Return success (without password)
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