import '@testing-library/jest-dom';

// Mock window.location by saving original and restoring
const originalLocation = window.location;

beforeAll(() => {
  delete window.location;
  window.location = {
    href: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: ''
  };
});

afterAll(() => {
  window.location = originalLocation;
});

beforeEach(() => {
  window.location.href = '';
});
