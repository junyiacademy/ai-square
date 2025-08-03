/**
 * Index Export Tests
 * Tests for service index exports
 */

describe('Service Index Exports', () => {
  it('should export user data types', () => {
    const exports = require('../index');
    
    // Check that exports object exists
    expect(exports).toBeDefined();
    
    // Check key exports are available
    expect(exports.UserDataService).toBeDefined();
    expect(exports.createUserDataService).toBeDefined();
    expect(exports.userDataService).toBeDefined();
    expect(exports.UserDataServiceClient).toBeDefined();
    expect(exports.createUserDataServiceClient).toBeDefined();
  });

  it('should not export removed GCS implementation', () => {
    const exports = require('../index');
    
    // These should not exist as per the comment in the file
    expect(exports.UserDataServiceGCS).toBeUndefined();
    expect(exports.createUserDataServiceGCS).toBeUndefined();
  });

  it('should successfully import all exports', () => {
    // This test verifies that all exports can be imported without errors
    expect(() => {
      const {
        UserDataService,
        createUserDataService,
        userDataService,
        UserDataServiceClient,
        createUserDataServiceClient
      } = require('../index');
      
      expect(UserDataService).toBeDefined();
      expect(createUserDataService).toBeDefined();
      expect(userDataService).toBeDefined();
      expect(UserDataServiceClient).toBeDefined();
      expect(createUserDataServiceClient).toBeDefined();
    }).not.toThrow();
  });
});