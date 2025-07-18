/**
 * Scenario ID Resolver Utility
 * Provides helper functions to resolve scenario IDs (YAML ID or UUID)
 */

import { scenarioIndexService } from '@/lib/services/scenario-index-service';
import { scenarioIndexBuilder } from '@/lib/services/scenario-index-builder';

/**
 * Check if a string is a valid UUID
 */
export function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Resolve any scenario ID (YAML ID or UUID) to UUID
 * @param id - Either a YAML ID or UUID
 * @returns The UUID or null if not found
 */
export async function resolveToUUID(id: string): Promise<string | null> {
  if (isUUID(id)) {
    return id;
  }

  // Ensure index exists
  await scenarioIndexBuilder.ensureIndex();
  
  // Look up UUID by YAML ID
  return scenarioIndexService.getUuidByYamlId(id);
}

/**
 * Resolve any scenario ID (YAML ID or UUID) to YAML ID
 * @param id - Either a YAML ID or UUID
 * @returns The YAML ID or null if not found
 */
export async function resolveToYamlId(id: string): Promise<string | null> {
  if (!isUUID(id)) {
    // Already a YAML ID, verify it exists
    await scenarioIndexBuilder.ensureIndex();
    const uuid = await scenarioIndexService.getUuidByYamlId(id);
    return uuid ? id : null;
  }

  // Look up YAML ID by UUID
  return scenarioIndexService.getYamlIdByUuid(id);
}

/**
 * Get scenario info by any ID
 * @param id - Either a YAML ID or UUID
 * @returns Scenario entry or null if not found
 */
export async function getScenarioInfo(id: string) {
  await scenarioIndexBuilder.ensureIndex();
  
  if (isUUID(id)) {
    return scenarioIndexService.getEntryByUuid(id);
  } else {
    return scenarioIndexService.getEntryByYamlId(id);
  }
}

/**
 * Batch resolve multiple IDs to UUIDs
 * @param ids - Array of YAML IDs or UUIDs
 * @returns Map of input ID to UUID
 */
export async function batchResolveToUUIDs(ids: string[]): Promise<Map<string, string>> {
  await scenarioIndexBuilder.ensureIndex();
  
  const result = new Map<string, string>();
  const yamlIds: string[] = [];
  
  // Separate UUIDs and YAML IDs
  for (const id of ids) {
    if (isUUID(id)) {
      result.set(id, id);
    } else {
      yamlIds.push(id);
    }
  }
  
  // Batch lookup YAML IDs
  if (yamlIds.length > 0) {
    const yamlToUuid = await scenarioIndexService.getUuidsByYamlIds(yamlIds);
    for (const [yamlId, uuid] of yamlToUuid) {
      result.set(yamlId, uuid);
    }
  }
  
  return result;
}