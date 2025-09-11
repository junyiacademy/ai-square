import { NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET() {
  try {
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get all users (limit to 100 for safety)
    const users = await userRepo.findMany?.({ limit: 100 }) || [];
    
    // Remove sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    }));
    
    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        users: [] 
      },
      { status: 500 }
    );
  }
}