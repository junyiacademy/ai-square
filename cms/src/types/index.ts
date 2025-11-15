// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// GitHub Types
export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  content: string;
  size: number;
  type: 'file' | 'dir';
  download_url?: string;
  html_url?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged: boolean;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
  } | null;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  mergeable: boolean | null;
  mergeable_state: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

// File System Types
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  content: string;
  size: number;
  type: 'file' | 'dir';
}

// Cache Types
export interface CacheEntry<T = unknown> {
  data: T;
  expires: number;
  etag?: string;
}

// YAML Content Types
export interface YAMLValidation {
  valid: boolean;
  errors: string[];
  summary: string;
}

export interface ScenarioInfo {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  target_domains: string[];
  prerequisites: string[];
  learning_objectives: string[];
  [key: string]: any; // For translation fields like title_zh, title_es, etc.
}

export interface KSAMapping {
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  estimated_duration: number;
  category?: string;
  instructions?: string;
  expected_outcome?: string;
  time_limit?: number;
  resources?: string[];
  assessment_focus?: {
    primary: string[];
    secondary: string[];
  };
  ai_module?: {
    role: string;
    model: string;
    persona: string;
    initial_prompt: string;
  };
  [key: string]: any; // For translation fields
}

export interface PBLScenario {
  scenario_info: ScenarioInfo;
  ksa_mapping: KSAMapping;
  tasks: Task[];
}

// AI Assistant Types
export interface AIAssistRequest {
  action: 'complete' | 'translate' | 'improve' | 'ksa';
  content: string;
  file?: string;
}

export interface AIAssistResponse {
  result: string;
  validation: YAMLValidation;
}

// Git Operations Types
export interface BranchCreateRequest {
  fileName: string;
}

export interface BranchCreateResponse {
  success: boolean;
  branch: string;
  message?: string;
  error?: string;
}

export interface CommitMessageRequest {
  filePath: string;
  oldContent: string;
  newContent: string;
}

export interface CommitMessageResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface PullRequestCreateRequest {
  title: string;
  body: string;
}

export interface PullRequestCreateResponse {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  description?: string;
  error?: string;
}

// Processing Modal Types
export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ProcessingModalState {
  isOpen: boolean;
  steps: ProcessingStep[];
  currentStep: number;
  commitMessage: string;
  prDescription: string;
  branchName: string;
}

// Error Types
export interface ErrorResponse {
  error: string;
  status?: number;
  details?: unknown;
}

// Octokit Extended Types
export interface OctokitError {
  status: number;
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}
