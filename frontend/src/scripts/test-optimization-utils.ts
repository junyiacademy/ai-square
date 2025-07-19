#!/usr/bin/env node

/**
 * Simple test for optimization utilities
 */

import { memoize, parallel } from '../lib/api/optimization-utils';

async function testMemoize() {
  console.log('Testing memoize...');
  
  let callCount = 0;
  const expensiveFunction = memoize(async (input: string) => {
    callCount++;
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    return `Result for ${input}`;
  });
  
  // First call
  const start1 = Date.now();
  const result1 = await expensiveFunction('test');
  const time1 = Date.now() - start1;
  console.log(`First call: ${result1} (${time1}ms)`);
  
  // Second call (should be cached)
  const start2 = Date.now();
  const result2 = await expensiveFunction('test');
  const time2 = Date.now() - start2;
  console.log(`Second call: ${result2} (${time2}ms)`);
  
  console.log(`Call count: ${callCount}`);
  console.log(`Speed improvement: ${(time1 / time2).toFixed(1)}x faster`);
  
  if (callCount === 1 && time2 < time1) {
    console.log('✅ Memoize test passed');
  } else {
    console.log('❌ Memoize test failed');
  }
}

async function testParallel() {
  console.log('\nTesting parallel...');
  
  const slowFunction = async (delay: number, name: string) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return `${name} done after ${delay}ms`;
  };
  
  // Sequential execution
  const start1 = Date.now();
  const seq1 = await slowFunction(100, 'Task 1');
  await slowFunction(100, 'Task 2');
  await slowFunction(100, 'Task 3');
  const sequentialTime = Date.now() - start1;
  console.log(`Sequential: ${sequentialTime}ms`);
  
  // Parallel execution
  const start2 = Date.now();
  const [par1] = await parallel(
    slowFunction(100, 'Task 1'),
    slowFunction(100, 'Task 2'),
    slowFunction(100, 'Task 3')
  );
  const parallelTime = Date.now() - start2;
  console.log(`Parallel: ${parallelTime}ms`);
  
  console.log(`Speed improvement: ${(sequentialTime / parallelTime).toFixed(1)}x faster`);
  
  if (parallelTime < sequentialTime && par1 === seq1) {
    console.log('✅ Parallel test passed');
  } else {
    console.log('❌ Parallel test failed');
  }
}

async function runTests() {
  console.log('🧪 Testing optimization utilities...\n');
  
  await testMemoize();
  await testParallel();
  
  console.log('\n✅ All optimization utility tests completed!');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}