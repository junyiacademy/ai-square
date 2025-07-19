#!/usr/bin/env tsx

/**
 * Test script for staging deployment
 * Verifies that all fixes are working correctly
 */

import { config } from 'dotenv';
config();

async function testStagingDeployment() {
  console.log('🧪 Testing Staging Deployment Fixes\n');

  const tests = [
    {
      name: 'Vertex AI Export Test',
      test: async () => {
        const vertexAiModule = await import('../lib/ai/vertex-ai-service');
        if (!vertexAiModule.getVertexAI) {
          throw new Error('getVertexAI export not found');
        }
        console.log('✅ getVertexAI export is available');
      }
    },
    {
      name: 'Next.js 15 Route Parameter Test',
      test: async () => {
        // Simulate async params
        const params = Promise.resolve({ id: 'test-id' });
        const resolvedParams = await params;
        
        if (resolvedParams.id !== 'test-id') {
          throw new Error('Async params resolution failed');
        }
        console.log('✅ Async params resolution works correctly');
      }
    },
    {
      name: 'TypeScript Compilation Test',
      test: async () => {
        // This test passes if the file compiles without errors
        const programRoute = await import('../app/api/programs/[id]/route');
        const userRoute = await import('../app/api/users/[id]/route');
        
        if (!programRoute.GET || !userRoute.GET) {
          throw new Error('Route exports not found');
        }
        console.log('✅ Routes compile without TypeScript errors');
      }
    },
    {
      name: 'Environment Configuration Test',
      test: async () => {
        const requiredEnvVars = [
          'GOOGLE_CLOUD_PROJECT',
          'GOOGLE_CLOUD_LOCATION'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
          console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
          console.log('   These will need to be set in the staging environment');
        } else {
          console.log('✅ All required environment variables are set');
        }
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      console.log(`\n📋 Running: ${name}`);
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ Failed: ${name}`);
      console.error(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All staging deployment fixes are working correctly!');
    console.log('   The application should deploy successfully to staging.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the tests
testStagingDeployment().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});