#!/usr/bin/env tsx
/**
 * Test Scenario Initialization
 * 測試 YAML to Scenarios 初始化功能
 */

import { scenarioInitService } from '@/lib/services/scenario-initialization-service';

async function testInit() {
  console.log('Testing Scenario Initialization...\n');

  try {
    // Test Assessment initialization with dry run
    console.log('1. Testing Assessment initialization (dry run)...');
    const assessmentResult = await scenarioInitService.initializeAssessmentScenarios();
    console.log('Assessment Result:', {
      total: assessmentResult.total,
      created: assessmentResult.created,
      errors: assessmentResult.errors.length
    });
    
    if (assessmentResult.errors.length > 0) {
      console.error('Assessment errors:', assessmentResult.errors);
    }
    
    console.log('\n2. Testing PBL initialization (dry run)...');
    const pblResult = await scenarioInitService.initializePBLScenarios();
    console.log('PBL Result:', {
      total: pblResult.total,
      created: pblResult.created,
      errors: pblResult.errors.length
    });
    
    if (pblResult.errors.length > 0) {
      console.error('PBL errors:', pblResult.errors);
    }
    
    console.log('\n3. Testing Discovery initialization (dry run)...');
    const discoveryResult = await scenarioInitService.initializeDiscoveryScenarios();
    console.log('Discovery Result:', {
      total: discoveryResult.total,
      created: discoveryResult.created,
      errors: discoveryResult.errors.length
    });
    
    if (discoveryResult.errors.length > 0) {
      console.error('Discovery errors:', discoveryResult.errors);
    }
    
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testInit();