/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env tsx
/**
 * Initialize Scenarios from YAML files
 * 
 * Usage:
 *   npm run init:scenarios              # Initialize all scenarios
 *   npm run init:scenarios -- --pbl     # Initialize only PBL scenarios
 *   npm run init:scenarios -- --discovery  # Initialize only Discovery scenarios
 *   npm run init:scenarios -- --assessment  # Initialize only Assessment scenarios
 *   npm run init:scenarios -- --dry-run    # Dry run without creating scenarios
 *   npm run init:scenarios -- --force      # Force update existing scenarios
 */

import { scenarioInitService, type InitializationResult } from '@/lib/services/scenario-initialization-service';
import { program } from 'commander';
import chalk from 'chalk';

// Parse command line arguments
program
  .option('--pbl', 'Initialize only PBL scenarios')
  .option('--discovery', 'Initialize only Discovery scenarios')
  .option('--assessment', 'Initialize only Assessment scenarios')
  .option('--dry-run', 'Run without actually creating/updating scenarios')
  .option('--force', 'Force update existing scenarios')
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log(chalk.blue('🚀 Starting Scenario Initialization'));
  console.log(chalk.gray('================================'));

  try {
    const results = [];

    // Determine which scenarios to initialize
    const initAll = !options.pbl && !options.discovery && !options.assessment;

    const initOptions = {
      forceUpdate: options.force,
      dryRun: options.dryRun
    };

    if (initAll || options.pbl) {
      console.log(chalk.yellow('\n📚 Initializing PBL Scenarios...'));
      const pblResult = await scenarioInitService.initializePBLScenarios(initOptions);
      results.push(pblResult);
      printResult(pblResult);
    }

    if (initAll || options.discovery) {
      console.log(chalk.yellow('\n🌍 Initializing Discovery Scenarios...'));
      const discoveryResult = await scenarioInitService.initializeDiscoveryScenarios(initOptions);
      results.push(discoveryResult);
      printResult(discoveryResult);
    }

    if (initAll || options.assessment) {
      console.log(chalk.yellow('\n📝 Initializing Assessment Scenarios...'));
      const assessmentResult = await scenarioInitService.initializeAssessmentScenarios(initOptions);
      results.push(assessmentResult);
      printResult(assessmentResult);
    }

    // Print summary
    printSummary(results);

  } catch (_error) {
    console.error(chalk.red('\n❌ Initialization failed:'), error);
    process.exit(1);
  }
}

function printResult(result: InitializationResult) {
  console.log(chalk.green(`✓ Total: ${result.total}`));
  console.log(chalk.green(`✓ Created: ${result.created}`));
  console.log(chalk.yellow(`✓ Updated: ${result.updated}`));
  console.log(chalk.gray(`✓ Skipped: ${result.skipped}`));
  
  if (result.errors.length > 0) {
    console.log(chalk.red(`✗ Errors: ${result.errors.length}`));
    result.errors.forEach((error: string) => {
      console.log(chalk.red(`  - ${error}`));
    });
  }
}

function printSummary(results: InitializationResult[]) {
  console.log(chalk.blue('\n📊 Summary'));
  console.log(chalk.gray('================================'));
  
  const totals = results.reduce((acc, r) => ({
    total: acc.total + r.total,
    created: acc.created + r.created,
    updated: acc.updated + r.updated,
    skipped: acc.skipped + r.skipped,
    errors: acc.errors + r.errors.length
  }), { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 });

  console.log(chalk.green(`Total scenarios processed: ${totals.total}`));
  console.log(chalk.green(`Created: ${totals.created}`));
  console.log(chalk.yellow(`Updated: ${totals.updated}`));
  console.log(chalk.gray(`Skipped: ${totals.skipped}`));
  
  if (totals.errors > 0) {
    console.log(chalk.red(`Errors: ${totals.errors}`));
  }

  if (options.dryRun) {
    console.log(chalk.yellow('\n⚠️  This was a dry run. No scenarios were actually created/updated.'));
  }
}

// Run the script
main().catch(console.error);