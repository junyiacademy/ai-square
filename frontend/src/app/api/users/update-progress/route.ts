import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Initialize GCS
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db';
const bucket = storage.bucket(BUCKET_NAME);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, stage, data } = body;

    if (!email || !stage) {
      return NextResponse.json(
        { success: false, error: 'Email and stage are required' },
        { status: 400 }
      );
    }

    // Sanitize email for file path
    const sanitizedEmail = email.replace('@', '_at_').replace(/\./g, '_');
    const filePath = `user/${sanitizedEmail}/user_data.json`;
    const file = bucket.file(filePath);

    // Load existing user data
    let userData: any = {};
    try {
      const [exists] = await file.exists();
      if (exists) {
        const [contents] = await file.download();
        userData = JSON.parse(contents.toString());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }

    // Initialize onboarding object if not exists
    if (!userData.onboarding) {
      userData.onboarding = {
        welcomeCompleted: false,
        identityCompleted: false,
        goalsCompleted: false,
        completedAt: null
      };
    }

    // Update based on stage
    switch (stage) {
      case 'welcome':
        userData.onboarding.welcomeCompleted = true;
        userData.onboarding.welcomeCompletedAt = new Date().toISOString();
        break;
      
      case 'identity':
        userData.onboarding.identityCompleted = true;
        userData.onboarding.identityCompletedAt = new Date().toISOString();
        userData.identity = data.identity;
        break;
      
      case 'goals':
        userData.onboarding.goalsCompleted = true;
        userData.onboarding.goalsCompletedAt = new Date().toISOString();
        userData.interests = data.interests || [];
        userData.learningGoals = data.goals || [];
        userData.onboarding.completedAt = new Date().toISOString();
        break;

      case 'assessment':
        userData.assessmentCompleted = true;
        userData.assessmentCompletedAt = new Date().toISOString();
        userData.assessmentResult = data.result;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid stage' },
          { status: 400 }
        );
    }

    // Update last modified
    userData.lastModified = new Date().toISOString();

    // Save back to GCS
    await file.save(JSON.stringify(userData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });

    console.log(`✅ Updated ${stage} progress for ${email}`);

    return NextResponse.json({
      success: true,
      message: `${stage} progress updated successfully`,
      userData
    });

  } catch (error) {
    console.error('Error updating user progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}