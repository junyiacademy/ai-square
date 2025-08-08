const createTransport = jest.fn(() => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' })
}));

module.exports = {
  createTransport
};