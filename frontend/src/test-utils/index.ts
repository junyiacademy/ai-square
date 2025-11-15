/**
 * Test Utilities
 * 統一導出所有測試工具
 */

// Setup (需要在 jest.config 中引入)
export * from './setup';

// Mocks
export * from './mocks/next-auth';
export * from './mocks/repositories';
export * from './mocks/i18n';
export * from './mocks/d3';
export * from './mocks/components';

// Helpers
export * from './helpers/render';
export * from './helpers/api';
export * from './helpers/queries';

// Re-export testing library utilities
export { screen, waitFor, within, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Default export render helper - use renderWithProviders
export { renderWithProviders as render } from './helpers/render';

// Re-export Jest DOM matchers
import '@testing-library/jest-dom';
