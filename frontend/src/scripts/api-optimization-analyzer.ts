#!/usr/bin/env tsx
/**
 * API Optimization Analyzer
 * Analyzes API code for performance optimization opportunities
 */

import fs from 'fs/promises';
import { glob } from 'glob';

interface OptimizationOpportunity {
  file: string;
  line: number;
  type: 'caching' | 'query' | 'n+1' | 'serialization' | 'parallel' | 'memory';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

class APIOptimizationAnalyzer {
  private opportunities: OptimizationOpportunity[] = [];

  async analyze() {
    console.log('🔍 Analyzing API routes for optimization opportunities...\n');

    // Find all API route files
    const apiFiles = await glob('src/app/api/**/route.ts');
    
    for (const file of apiFiles) {
      await this.analyzeFile(file);
    }

    // Generate report
    this.generateReport();
  }

  private async analyzeFile(filePath: string) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    console.log(`Analyzing ${filePath}...`);

    // Check for missing caching
    this.checkCaching(filePath, lines);
    
    // Check for N+1 queries
    this.checkNPlusOne(filePath, lines);
    
    // Check for sequential operations that could be parallel
    this.checkParallelization(filePath, lines);
    
    // Check for missing pagination
    this.checkPagination(filePath, lines);
    
    // Check for heavy JSON serialization
    this.checkSerialization(filePath, lines);
    
    // Check for memory inefficiencies
    this.checkMemoryUsage(filePath, lines);
  }

  private checkCaching(filePath: string, lines: string[]) {
    const hasCache = lines.some(line => 
      line.includes('cache') || 
      line.includes('Cache') ||
      line.includes('redis') ||
      line.includes('memcached')
    );

    const isGetEndpoint = lines.some(line => 
      line.includes('export async function GET') ||
      line.includes('export function GET')
    );

    if (isGetEndpoint && !hasCache) {
      // Check if it's a data fetching endpoint
      const fetchesData = lines.some(line => 
        line.includes('fetch') ||
        line.includes('findMany') ||
        line.includes('findOne') ||
        line.includes('readFile') ||
        line.includes('yaml.load')
      );

      if (fetchesData) {
        this.opportunities.push({
          file: filePath,
          line: 0,
          type: 'caching',
          severity: 'high',
          description: 'GET endpoint fetches data without caching',
          suggestion: 'Implement caching using cacheService or Next.js cache headers'
        });
      }
    }
  }

  private checkNPlusOne(filePath: string, lines: string[]) {
    let inLoop = false;

    lines.forEach((line, index) => {
      // Detect loop start
      if (line.includes('for (') || line.includes('forEach') || line.includes('.map(')) {
        inLoop = true;
      }

      // Detect loop end
      if (inLoop && (line.includes('}') && !line.includes('{{'))) {
        inLoop = false;
      }

      // Check for queries inside loops
      if (inLoop && (
        line.includes('await fetch') ||
        line.includes('await db.') ||
        line.includes('findOne') ||
        line.includes('findMany') ||
        line.includes('readFile')
      )) {
        this.opportunities.push({
          file: filePath,
          line: index + 1,
          type: 'n+1',
          severity: 'high',
          description: 'Potential N+1 query problem - database/API call inside loop',
          suggestion: 'Batch queries outside the loop or use includes/joins'
        });
      }
    });
  }

  private checkParallelization(filePath: string, lines: string[]) {
    let sequentialAwaits = 0;
    let lastAwaitLine = -1;

    lines.forEach((line, index) => {
      if (line.includes('await ') && !line.includes('await Promise.')) {
        if (lastAwaitLine === index - 1 || lastAwaitLine === index - 2) {
          sequentialAwaits++;
        } else {
          if (sequentialAwaits >= 2) {
            this.opportunities.push({
              file: filePath,
              line: lastAwaitLine + 1,
              type: 'parallel',
              severity: 'medium',
              description: 'Multiple sequential await operations could be parallelized',
              suggestion: 'Use Promise.all() to execute independent operations in parallel'
            });
          }
          sequentialAwaits = 1;
        }
        lastAwaitLine = index;
      }
    });
  }

  private checkPagination(filePath: string, lines: string[]) {
    const hasListOperation = lines.some(line => 
      line.includes('findMany') ||
      line.includes('getAll') ||
      line.includes('list') ||
      line.includes('.filter(')
    );

    const hasPagination = lines.some(line => 
      line.includes('limit') ||
      line.includes('skip') ||
      line.includes('page') ||
      line.includes('offset') ||
      line.includes('take')
    );

    if (hasListOperation && !hasPagination) {
      this.opportunities.push({
        file: filePath,
        line: 0,
        type: 'query',
        severity: 'medium',
        description: 'List operation without pagination',
        suggestion: 'Implement pagination to limit data transfer and improve response times'
      });
    }
  }

  private checkSerialization(filePath: string, lines: string[]) {
    lines.forEach((line, index) => {
      // Check for large JSON operations
      if (line.includes('JSON.stringify') && (
        line.includes('findMany') ||
        line.includes('getAll') ||
        lines[index - 1]?.includes('const') && lines[index - 1]?.includes('await')
      )) {
        this.opportunities.push({
          file: filePath,
          line: index + 1,
          type: 'serialization',
          severity: 'low',
          description: 'Large JSON serialization detected',
          suggestion: 'Consider streaming responses or implementing field selection'
        });
      }

      // Check for repeated field access
      if (line.includes('NextResponse.json') && line.includes('map(')) {
        const hasFieldSelection = line.includes('id:') || line.includes('name:');
        if (!hasFieldSelection) {
          this.opportunities.push({
            file: filePath,
            line: index + 1,
            type: 'serialization',
            severity: 'low',
            description: 'Returning full objects without field selection',
            suggestion: 'Select only required fields to reduce payload size'
          });
        }
      }
    });
  }

  private checkMemoryUsage(filePath: string, lines: string[]) {
    lines.forEach((line, index) => {
      // Check for loading entire files into memory
      if (line.includes('readFile') && !line.includes('createReadStream')) {
        this.opportunities.push({
          file: filePath,
          line: index + 1,
          type: 'memory',
          severity: 'medium',
          description: 'Loading entire file into memory',
          suggestion: 'Use streams for large files to reduce memory usage'
        });
      }

      // Check for large array operations
      if (line.includes('.map(') && line.includes('.filter(') && line.includes('.reduce(')) {
        this.opportunities.push({
          file: filePath,
          line: index + 1,
          type: 'memory',
          severity: 'low',
          description: 'Multiple array operations creating intermediate arrays',
          suggestion: 'Consider using a single reduce operation or generators'
        });
      }
    });
  }

  private generateReport() {
    console.log('\n📊 API Optimization Report\n');
    console.log('='.repeat(80));
    
    if (this.opportunities.length === 0) {
      console.log('✅ No major optimization opportunities found!');
      return;
    }

    // Group by severity
    const high = this.opportunities.filter(o => o.severity === 'high');
    const medium = this.opportunities.filter(o => o.severity === 'medium');
    const low = this.opportunities.filter(o => o.severity === 'low');

    // High severity
    if (high.length > 0) {
      console.log('\n🔴 High Priority Optimizations:\n');
      high.forEach(this.printOpportunity);
    }

    // Medium severity
    if (medium.length > 0) {
      console.log('\n🟡 Medium Priority Optimizations:\n');
      medium.forEach(this.printOpportunity);
    }

    // Low severity
    if (low.length > 0) {
      console.log('\n🟢 Low Priority Optimizations:\n');
      low.forEach(this.printOpportunity);
    }

    // Summary
    console.log('\n📈 Summary:');
    console.log(`  Total opportunities: ${this.opportunities.length}`);
    console.log(`  High priority: ${high.length}`);
    console.log(`  Medium priority: ${medium.length}`);
    console.log(`  Low priority: ${low.length}`);

    // Type breakdown
    const typeBreakdown = this.opportunities.reduce((acc, o) => {
      acc[o.type] = (acc[o.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 By Type:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  private printOpportunity(o: OptimizationOpportunity) {
    console.log(`📍 ${o.file}${o.line > 0 ? `:${o.line}` : ''}`);
    console.log(`   Type: ${o.type}`);
    console.log(`   Issue: ${o.description}`);
    console.log(`   Fix: ${o.suggestion}`);
    console.log('');
  }
}

// Run the analyzer
async function main() {
  const analyzer = new APIOptimizationAnalyzer();
  await analyzer.analyze();
}

main().catch(console.error);