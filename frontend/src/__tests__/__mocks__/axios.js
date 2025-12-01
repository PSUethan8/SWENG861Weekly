// Mock axios module
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

const axios = {
  create: jest.fn(() => mockApi),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// Export the mock API for test access
export const getMockApi = () => mockApi;

export default axios;




