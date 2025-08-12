// Mock uuid with a valid UUID format
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    // Generate a valid UUID v4 format for testing
    uuidCounter++;
    const hex = uuidCounter.toString(16).padStart(8, '0');
    // Create a proper UUID v4 format with correct length
    return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
  }),
})) 