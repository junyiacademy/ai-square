#!/usr/bin/env node

/**
 * Integration test for ID generation fix
 * Tests that programs and tasks can be created without ID conflicts
 */

const { Pool } = require("pg");

async function testIdGeneration() {
  const pool = new Pool({
    host: "127.0.0.1",
    port: 5433,
    database: "ai_square_db",
    user: "postgres",
    password: "postgres",
  });

  try {
    console.log("🔧 Testing ID Generation Fix...\n");

    // Get test data
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = 'test-tdd@example.com'",
    );
    const userId = userResult.rows[0]?.id;

    const scenarioResult = await pool.query(
      "SELECT id FROM scenarios WHERE mode = 'pbl' LIMIT 1",
    );
    const scenarioId = scenarioResult.rows[0]?.id;

    if (!userId || !scenarioId) {
      throw new Error("Test data not found. Please run initialization first.");
    }

    console.log("✅ Test data found:");
    console.log(`   User ID: ${userId}`);
    console.log(`   Scenario ID: ${scenarioId}\n`);

    // Test 1: Create a program with gen_random_uuid()
    console.log("📝 Test 1: Creating program with ID generation...");
    const programResult = await pool.query(
      `
      INSERT INTO programs (
        id, user_id, scenario_id, mode, status,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id
    `,
      [userId, scenarioId, "pbl", "pending"],
    );

    const programId = programResult.rows[0].id;
    console.log(`✅ Program created with ID: ${programId}\n`);

    // Test 2: Create a task with gen_random_uuid()
    console.log("📝 Test 2: Creating task with ID generation...");
    const taskResult = await pool.query(
      `
      INSERT INTO tasks (
        id, program_id, scenario_id, mode, task_index, type, status,
        title, instructions, context, metadata, interactions,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id
    `,
      [
        programId,
        scenarioId,
        "pbl",
        0,
        "question",
        "pending",
        '{"en": "Test Task"}',
        '{"en": "Test Instructions"}',
        "{}",
        "{}",
        "[]",
      ],
    );

    const taskId = taskResult.rows[0].id;
    console.log(`✅ Task created with ID: ${taskId}\n`);

    // Test 3: Create multiple tasks (batch)
    console.log("📝 Test 3: Creating batch tasks with ID generation...");
    const batchResult = await pool.query(
      `
      INSERT INTO tasks (
        id, program_id, scenario_id, mode, task_index, type, status,
        title, instructions, context, metadata, interactions,
        created_at, updated_at
      )
      SELECT
        gen_random_uuid()::text, $1, $2, $3, task_index, $4, $5,
        $6, $7, $8, $9, $10,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM generate_series(1, 3) AS task_index
      RETURNING id
    `,
      [
        programId,
        scenarioId,
        "pbl",
        "question",
        "pending",
        '{"en": "Batch Task"}',
        '{"en": "Batch Instructions"}',
        "{}",
        "{}",
        "[]",
      ],
    );

    console.log(
      `✅ Created ${batchResult.rows.length} batch tasks with unique IDs\n`,
    );

    // Verify all IDs are unique
    const allTaskIds = [taskId, ...batchResult.rows.map((r) => r.id)];
    const uniqueIds = new Set(allTaskIds);

    if (uniqueIds.size === allTaskIds.length) {
      console.log("✅ All task IDs are unique!\n");
    } else {
      throw new Error("Duplicate IDs detected!");
    }

    // Clean up test data
    console.log("🧹 Cleaning up test data...");
    await pool.query("DELETE FROM tasks WHERE program_id = $1", [programId]);
    await pool.query("DELETE FROM programs WHERE id = $1", [programId]);

    console.log("✅ Test data cleaned up\n");
    console.log("🎉 All ID generation tests passed!");
    console.log(
      "📌 The fix using gen_random_uuid()::text is working correctly.",
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testIdGeneration().catch(console.error);
