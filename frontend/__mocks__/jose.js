// Mock for jose JWT library
module.exports = {
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock-jwt-token"),
  })),
  jwtVerify: jest.fn().mockImplementation((token) => {
    // Mock different responses based on token
    if (token === "valid-access-token") {
      return Promise.resolve({
        payload: { userId: 1, exp: Math.floor(Date.now() / 1000) + 900 },
      });
    }
    if (token === "valid-refresh-token") {
      return Promise.resolve({
        payload: { userId: 1 },
      });
    }
    return Promise.reject(new Error("Invalid token"));
  }),
};
