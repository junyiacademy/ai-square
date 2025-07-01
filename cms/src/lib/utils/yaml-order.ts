// Define the correct order for YAML keys based on PBL schema
export const YAML_KEY_ORDER = {
  // Root level
  root: ['scenario_info', 'ksa_mapping', 'tasks'],
  
  // scenario_info level
  scenario_info: [
    'id',
    'title',
    'title_zh',
    'title_es',
    'title_ja',
    'title_ko',
    'title_fr',
    'title_de',
    'title_ru',
    'title_it',
    'description',
    'description_zh',
    'description_es',
    'description_ja',
    'description_ko',
    'description_fr',
    'description_de',
    'description_ru',
    'description_it',
    'difficulty',
    'estimated_duration',
    'target_domains',
    'prerequisites',
    'prerequisites_zh',
    'prerequisites_es',
    'prerequisites_ja',
    'prerequisites_ko',
    'prerequisites_fr',
    'prerequisites_de',
    'prerequisites_ru',
    'prerequisites_it',
    'learning_objectives',
    'learning_objectives_zh',
    'learning_objectives_es',
    'learning_objectives_ja',
    'learning_objectives_ko',
    'learning_objectives_fr',
    'learning_objectives_de',
    'learning_objectives_ru',
    'learning_objectives_it',
  ],
  
  // ksa_mapping level
  ksa_mapping: ['knowledge', 'skills', 'attitudes'],
  
  // task level
  task: [
    'id',
    'title',
    'title_zh',
    'title_es',
    'title_ja',
    'title_ko',
    'title_fr',
    'title_de',
    'title_ru',
    'title_it',
    'description',
    'description_zh',
    'description_es',
    'description_ja',
    'description_ko',
    'description_fr',
    'description_de',
    'description_ru',
    'description_it',
    'category',
    'instructions',
    'instructions_zh',
    'instructions_es',
    'instructions_ja',
    'instructions_ko',
    'instructions_fr',
    'instructions_de',
    'instructions_ru',
    'instructions_it',
    'expected_outcome',
    'expected_outcome_zh',
    'expected_outcome_es',
    'expected_outcome_ja',
    'expected_outcome_ko',
    'expected_outcome_fr',
    'expected_outcome_de',
    'expected_outcome_ru',
    'expected_outcome_it',
    'time_limit',
    'resources',
    'resources_zh',
    'resources_es',
    'resources_ja',
    'resources_ko',
    'resources_fr',
    'resources_de',
    'resources_ru',
    'resources_it',
    'assessment_focus',
    'ai_module',
  ],
  
  // assessment_focus level
  assessment_focus: ['primary', 'secondary'],
  
  // ai_module level
  ai_module: ['role', 'model', 'persona', 'initial_prompt'],
};

// Custom sorting function for objects
export function sortObjectByKeyOrder<T extends Record<string, unknown>>(obj: T, keyOrder: string[]): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const sortedObj: Record<string, unknown> = {};
  
  // First, add keys in the specified order
  for (const key of keyOrder) {
    if (obj.hasOwnProperty(key)) {
      sortedObj[key] = obj[key];
    }
  }
  
  // Then, add any remaining keys not in the order list
  for (const key in obj) {
    if (!sortedObj.hasOwnProperty(key)) {
      sortedObj[key] = obj[key];
    }
  }
  
  return sortedObj as T;
}

// Recursively sort a PBL scenario object according to the schema order
export function sortPBLScenario<T extends Record<string, unknown>>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Sort root level
  const sorted = sortObjectByKeyOrder(data, YAML_KEY_ORDER.root) as Record<string, unknown>;
  
  // Sort scenario_info
  if (sorted.scenario_info) {
    sorted.scenario_info = sortObjectByKeyOrder(sorted.scenario_info, YAML_KEY_ORDER.scenario_info);
  }
  
  // Sort ksa_mapping
  if (sorted.ksa_mapping) {
    sorted.ksa_mapping = sortObjectByKeyOrder(sorted.ksa_mapping, YAML_KEY_ORDER.ksa_mapping);
  }
  
  // Sort tasks
  if (sorted.tasks && Array.isArray(sorted.tasks)) {
    sorted.tasks = sorted.tasks.map((task: Record<string, unknown>) => {
      const sortedTask = sortObjectByKeyOrder(task, YAML_KEY_ORDER.task);
      
      // Sort nested objects in task
      if (sortedTask.assessment_focus) {
        sortedTask.assessment_focus = sortObjectByKeyOrder(
          sortedTask.assessment_focus,
          YAML_KEY_ORDER.assessment_focus
        );
      }
      
      if (sortedTask.ai_module) {
        sortedTask.ai_module = sortObjectByKeyOrder(
          sortedTask.ai_module,
          YAML_KEY_ORDER.ai_module
        );
      }
      
      return sortedTask;
    });
  }
  
  return sorted as T;
}