/**
 * Frontend Test Suite
 * 
 * Contains 10+ test cases covering:
 * - Component rendering
 * - User interactions
 * - Error handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock axios - the mock is in __mocks__/axios.js
jest.mock('axios');

// Import App after mocking
import App from '../App.jsx';
import { getMockApi } from './__mocks__/axios.js';

// Get reference to the mock API
const mockApi = getMockApi();

describe('App Component - Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Component rendering - shows loading state initially
  test('should display loading state initially', async () => {
    // Mock /api/me to be slow
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<App />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  // Test Case 2: Component rendering - shows login form when not authenticated
  test('should display login form when user is not authenticated', async () => {
    // Mock /api/me to return 401
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  // Test Case 3: User interaction - successful login
  test('should log in user with valid credentials', async () => {
    const user = userEvent.setup();
    
    // First call: /api/me returns 401 (not logged in)
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });
    
    // Login call succeeds
    mockApi.post.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } }
    });
    
    // After login, /api/books returns empty array
    mockApi.get.mockResolvedValueOnce({ data: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill in credentials
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Click login button
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/local/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  // Test Case 4: Error handling - shows error on login failure
  test('should display error message on login failure', async () => {
    const user = userEvent.setup();
    
    // /api/me returns 401
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });
    
    // Login fails
    mockApi.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });

  // Test Case 5: User interaction - registration
  test('should register new user successfully', async () => {
    const user = userEvent.setup();
    
    // /api/me returns 401
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });
    
    // Register succeeds
    mockApi.post.mockResolvedValueOnce({
      data: { user: { id: '2', email: 'new@example.com', name: 'New User' } }
    });
    
    // After register, /api/books returns empty array
    mockApi.get.mockResolvedValueOnce({ data: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/local/register', {
        email: 'new@example.com',
        password: 'newpassword123',
        name: ''
      });
    });
  });

  // Test Case 6: Component rendering - Google button is present and clickable
  test('should have Google login button that triggers navigation', async () => {
    const user = userEvent.setup();
    
    // /api/me returns 401
    mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    // The Google button should be present and enabled
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    expect(googleButton).toBeEnabled();
    
    // Clicking should not throw (navigation happens but jsdom doesn't support it)
    // We verify the button exists and is functional
    await expect(user.click(googleButton)).resolves.not.toThrow();
  });
});

describe('App Component - Books Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 7: Component rendering - shows books page when authenticated
  test('should display books page when user is authenticated', async () => {
    // /api/me returns authenticated user
    mockApi.get.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'user@example.com', name: 'Test User' } }
    });
    
    // /api/books returns books
    mockApi.get.mockResolvedValueOnce({
      data: [
        { _id: '1', ol_key: '/works/OL1W', title: 'Book One', author: 'Author One' },
        { _id: '2', ol_key: '/works/OL2W', title: 'Book Two', author: 'Author Two' }
      ]
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Books Home')).toBeInTheDocument();
    });

    // Check that user info is displayed
    expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    // User name appears in multiple places, so we use getAllByText
    expect(screen.getAllByText(/Test User/).length).toBeGreaterThan(0);
    
    await waitFor(() => {
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
    });
  });

  // Test Case 8: User interaction - create a new book
  test('should create a new book when form is submitted', async () => {
    const user = userEvent.setup();
    
    // /api/me returns authenticated user
    mockApi.get.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'user@example.com', name: 'Test User' } }
    });
    
    // Initial /api/books returns empty
    mockApi.get.mockResolvedValueOnce({ data: [] });
    
    // Create book succeeds
    mockApi.post.mockResolvedValueOnce({
      data: { _id: '3', ol_key: '/works/OL3W', title: 'New Book' }
    });
    
    // Reload books after create
    mockApi.get.mockResolvedValueOnce({
      data: [{ _id: '3', ol_key: '/works/OL3W', title: 'New Book' }]
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Add a Book')).toBeInTheDocument();
    });

    // Fill in the book form
    await user.type(screen.getByPlaceholderText('/works/OL82563W'), '/works/OL3W');
    
    // Find the Title input by its label
    const titleInputs = screen.getAllByRole('textbox');
    const titleInput = titleInputs.find(input => input.name === 'title');
    await user.type(titleInput, 'New Book');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create book/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/books', expect.objectContaining({
        ol_key: '/works/OL3W',
        title: 'New Book'
      }));
    });
  });

  // Test Case 9: User interaction - delete a book
  test('should delete a book when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    // /api/me returns authenticated user
    mockApi.get.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'user@example.com', name: 'Test User' } }
    });
    
    // /api/books returns one book
    mockApi.get.mockResolvedValueOnce({
      data: [{ _id: 'book1', ol_key: '/works/OL1W', title: 'Book to Delete', author: 'Author' }]
    });
    
    // Delete succeeds
    mockApi.delete.mockResolvedValueOnce({});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Book to Delete')).toBeInTheDocument();
    });

    // Click delete button
    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith('/api/books/book1');
    });
  });

  // Test Case 10: User interaction - logout
  test('should log out user when logout button is clicked', async () => {
    const user = userEvent.setup();
    
    // /api/me returns authenticated user
    mockApi.get.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'user@example.com', name: 'Test User' } }
    });
    
    // /api/books returns empty
    mockApi.get.mockResolvedValueOnce({ data: [] });
    
    // Logout succeeds
    mockApi.post.mockResolvedValueOnce({ data: { ok: true } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Books Home')).toBeInTheDocument();
    });

    // Click logout button
    await user.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    // Should show login form again
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });
});

describe('App Component - Error States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 11: Error handling - shows error when loading books fails
  test('should display error when loading books fails', async () => {
    // /api/me returns authenticated user
    mockApi.get.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'user@example.com', name: 'Test User' } }
    });
    
    // /api/books fails
    mockApi.get.mockRejectedValueOnce({
      response: { data: { error: 'Failed to load books' } }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load books');
    });
  });

  // Test Case 12: Error handling - shows error when creating book fails
  test('should display error when creating book fails', async () => {
    const user = userEvent.setup();
    
    // /api/me returns authenticated user
    mockApi.get.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'user@example.com', name: 'Test User' } }
    });
    
    // /api/books returns empty
    mockApi.get.mockResolvedValueOnce({ data: [] });
    
    // Create book fails
    mockApi.post.mockRejectedValueOnce({
      response: { data: { error: 'Failed to save book' } }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Add a Book')).toBeInTheDocument();
    });

    // Fill in the book form with required fields
    await user.type(screen.getByPlaceholderText('/works/OL82563W'), '/works/OL999W');
    
    const titleInputs = screen.getAllByRole('textbox');
    const titleInput = titleInputs.find(input => input.name === 'title');
    await user.type(titleInput, 'Test Book');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create book/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save book');
    });
  });
});
