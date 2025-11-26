/**
 * Backend API Test Suite
 * 
 * Contains 20+ test cases covering:
 * - Happy paths (successful operations)
 * - Error handling (validation errors, auth errors, not found)
 * - Edge cases (empty data, boundary conditions)
 */

import request from 'supertest';
import { app, users } from './testApp.js';
import Book from '../books/Book.js';

// Helper to create authenticated agent
async function createAuthenticatedAgent() {
  const agent = request.agent(app);
  await agent
    .post('/auth/local/register')
    .send({
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      name: 'Test User'
    });
  return agent;
}

describe('Health Check API', () => {
  // Test Case 1: Happy path - health check returns ok
  test('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('Authentication API', () => {
  beforeEach(() => {
    users.clear();
  });

  // Test Case 2: Happy path - successful user registration
  test('POST /auth/local/register should create new user', async () => {
    const res = await request(app)
      .post('/auth/local/register')
      .send({
        email: 'newuser@example.com',
        password: 'securepass123',
        name: 'New User'
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(res.body.user.name).toBe('New User');
  });

  // Test Case 3: Error handling - registration without email
  test('POST /auth/local/register should fail without email', async () => {
    const res = await request(app)
      .post('/auth/local/register')
      .send({
        password: 'securepass123',
        name: 'New User'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and password are required');
  });

  // Test Case 4: Error handling - registration without password
  test('POST /auth/local/register should fail without password', async () => {
    const res = await request(app)
      .post('/auth/local/register')
      .send({
        email: 'test@example.com',
        name: 'New User'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and password are required');
  });

  // Test Case 5: Error handling - password too short
  test('POST /auth/local/register should fail with short password', async () => {
    const res = await request(app)
      .post('/auth/local/register')
      .send({
        email: 'test@example.com',
        password: 'short',
        name: 'New User'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 8 characters');
  });

  // Test Case 6: Error handling - duplicate email registration
  test('POST /auth/local/register should fail with duplicate email', async () => {
    // First registration
    await request(app)
      .post('/auth/local/register')
      .send({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'First User'
      });

    // Second registration with same email
    const res = await request(app)
      .post('/auth/local/register')
      .send({
        email: 'duplicate@example.com',
        password: 'password456',
        name: 'Second User'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('An account with this email already exists');
  });

  // Test Case 7: Edge case - email normalization (uppercase)
  test('POST /auth/local/register should normalize email to lowercase', async () => {
    const res = await request(app)
      .post('/auth/local/register')
      .send({
        email: 'UPPERCASE@EXAMPLE.COM',
        password: 'password123',
        name: 'Test User'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('uppercase@example.com');
  });

  // Test Case 8: Happy path - successful login
  test('POST /auth/local/login should authenticate valid user', async () => {
    const agent = request.agent(app);
    
    // Register first
    await agent
      .post('/auth/local/register')
      .send({
        email: 'login@example.com',
        password: 'password123',
        name: 'Login User'
      });

    // Logout
    await agent.post('/auth/logout');

    // Login
    const res = await agent
      .post('/auth/local/login')
      .send({
        email: 'login@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('login@example.com');
  });

  // Test Case 9: Error handling - login with wrong password
  test('POST /auth/local/login should fail with wrong password', async () => {
    // Register
    await request(app)
      .post('/auth/local/register')
      .send({
        email: 'wrongpass@example.com',
        password: 'correctpassword',
        name: 'Test User'
      });

    // Login with wrong password
    const res = await request(app)
      .post('/auth/local/login')
      .send({
        email: 'wrongpass@example.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // Test Case 10: Error handling - login with non-existent user
  test('POST /auth/local/login should fail for non-existent user', async () => {
    const res = await request(app)
      .post('/auth/local/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  // Test Case 11: Happy path - logout
  test('POST /auth/logout should log out user', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/local/register')
      .send({
        email: 'logout@example.com',
        password: 'password123',
        name: 'Logout User'
      });

    const res = await agent.post('/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  // Test Case 12: Happy path - get current user when authenticated
  test('GET /api/me should return user when authenticated', async () => {
    const agent = request.agent(app);
    
    await agent
      .post('/auth/local/register')
      .send({
        email: 'me@example.com',
        password: 'password123',
        name: 'Me User'
      });

    const res = await agent.get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('me@example.com');
  });

  // Test Case 13: Error handling - get current user when not authenticated
  test('GET /api/me should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body.user).toBeNull();
  });
});

describe('Books API', () => {
  beforeEach(() => {
    users.clear();
  });

  // Test Case 14: Error handling - access books without authentication
  test('GET /api/books should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/books');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  // Test Case 15: Happy path - get empty books list
  test('GET /api/books should return empty array when no books', async () => {
    const agent = await createAuthenticatedAgent();
    const res = await agent.get('/api/books');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Test Case 16: Happy path - create a book
  test('POST /api/books should create a new book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .post('/api/books')
      .send({
        ol_key: '/works/OL12345W',
        title: 'Test Book',
        author: 'Test Author',
        first_publish_year: 2020,
        isbn: '1234567890'
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Book');
    expect(res.body.author).toBe('Test Author');
    expect(res.body.ol_key).toBe('/works/OL12345W');
    expect(res.body._id).toBeDefined();
  });

  // Test Case 17: Happy path - get all books
  test('GET /api/books should return all books', async () => {
    const agent = await createAuthenticatedAgent();
    
    // Create two books
    await agent.post('/api/books').send({
      ol_key: '/works/OL111W',
      title: 'Book One'
    });
    await agent.post('/api/books').send({
      ol_key: '/works/OL222W',
      title: 'Book Two'
    });

    const res = await agent.get('/api/books');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  // Test Case 18: Happy path - get single book by ID
  test('GET /api/books/:id should return specific book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const createRes = await agent.post('/api/books').send({
      ol_key: '/works/OL333W',
      title: 'Specific Book',
      author: 'Specific Author'
    });

    const bookId = createRes.body._id;
    const res = await agent.get(`/api/books/${bookId}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Specific Book');
    expect(res.body._id).toBe(bookId);
  });

  // Test Case 19: Error handling - get non-existent book
  test('GET /api/books/:id should return 404 for non-existent book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent.get('/api/books/507f1f77bcf86cd799439011');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  // Test Case 20: Happy path - update a book
  test('PUT /api/books/:id should update existing book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const createRes = await agent.post('/api/books').send({
      ol_key: '/works/OL444W',
      title: 'Original Title',
      author: 'Original Author'
    });

    const bookId = createRes.body._id;
    const res = await agent
      .put(`/api/books/${bookId}`)
      .send({
        title: 'Updated Title',
        author: 'Updated Author'
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.author).toBe('Updated Author');
  });

  // Test Case 21: Error handling - update non-existent book
  test('PUT /api/books/:id should return 404 for non-existent book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .put('/api/books/507f1f77bcf86cd799439011')
      .send({ title: 'New Title' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  // Test Case 22: Happy path - delete a book
  test('DELETE /api/books/:id should delete existing book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const createRes = await agent.post('/api/books').send({
      ol_key: '/works/OL555W',
      title: 'Book to Delete'
    });

    const bookId = createRes.body._id;
    const deleteRes = await agent.delete(`/api/books/${bookId}`);

    expect(deleteRes.status).toBe(204);

    // Verify book is deleted
    const getRes = await agent.get(`/api/books/${bookId}`);
    expect(getRes.status).toBe(404);
  });

  // Test Case 23: Error handling - delete non-existent book
  test('DELETE /api/books/:id should return 404 for non-existent book', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent.delete('/api/books/507f1f77bcf86cd799439011');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  // Test Case 24: Edge case - create book with minimal data (only required fields)
  test('POST /api/books should create book with only required fields', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .post('/api/books')
      .send({
        ol_key: '/works/OL666W',
        title: 'Minimal Book'
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Minimal Book');
    expect(res.body.author).toBeUndefined();
    expect(res.body.isbn).toBeUndefined();
  });

  // Test Case 25: Edge case - book with very long title
  test('POST /api/books should handle long title', async () => {
    const agent = await createAuthenticatedAgent();
    const longTitle = 'A'.repeat(500);
    
    const res = await agent
      .post('/api/books')
      .send({
        ol_key: '/works/OL777W',
        title: longTitle
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(longTitle);
  });
});

describe('Books Import API', () => {
  beforeEach(() => {
    users.clear();
  });

  // Test Case 26: Happy path - import books from valid docs
  test('POST /api/books/import should import valid book documents', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .post('/api/books/import')
      .send({
        docs: [
          {
            key: '/works/OL888W',
            title: 'Imported Book 1',
            author_name: ['Import Author'],
            first_publish_year: 2021,
            isbn: ['9781234567890']
          },
          {
            key: '/works/OL999W',
            title: 'Imported Book 2'
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(2);

    // Verify books were created
    const booksRes = await agent.get('/api/books');
    expect(booksRes.body).toHaveLength(2);
  });

  // Test Case 27: Edge case - import with empty docs array
  test('POST /api/books/import should handle empty docs array', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .post('/api/books/import')
      .send({ docs: [] });

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(0);
  });

  // Test Case 28: Error handling - import without docs array
  test('POST /api/books/import should fail without docs', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .post('/api/books/import')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('docs array is required');
  });

  // Test Case 29: Edge case - import skips invalid documents
  test('POST /api/books/import should skip invalid documents', async () => {
    const agent = await createAuthenticatedAgent();
    
    const res = await agent
      .post('/api/books/import')
      .send({
        docs: [
          { key: '/works/OL111W', title: 'Valid Book' },
          { title: 'Missing Key' },  // Invalid - no key
          { key: '/works/OL222W' },  // Invalid - no title
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(1); // Only one valid
  });

  // Test Case 30: Edge case - import handles duplicate keys (upsert)
  test('POST /api/books/import should upsert on duplicate keys', async () => {
    const agent = await createAuthenticatedAgent();
    
    // First import
    await agent
      .post('/api/books/import')
      .send({
        docs: [{ key: '/works/OLDUPLICATEW', title: 'Original Title' }]
      });

    // Second import with same key but different title
    await agent
      .post('/api/books/import')
      .send({
        docs: [{ key: '/works/OLDUPLICATEW', title: 'Updated Title' }]
      });

    const booksRes = await agent.get('/api/books');
    expect(booksRes.body).toHaveLength(1);
    expect(booksRes.body[0].title).toBe('Updated Title');
  });

  // Test Case 31: Error handling - import requires authentication
  test('POST /api/books/import should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/books/import')
      .send({ docs: [] });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});

describe('Validation Module', () => {
  // Import validateAndTransform - using dynamic import pattern for ES modules
  let validateAndTransform;
  
  beforeAll(async () => {
    const module = await import('../books/validation.js');
    validateAndTransform = module.validateAndTransform;
  });

  // Test Case 32: Happy path - transform valid Open Library document
  test('validateAndTransform should correctly transform valid docs', () => {
    const docs = [
      {
        key: '/works/OL123W',
        title: 'Test Book',
        author_name: ['Author One', 'Author Two'],
        first_publish_year: 2020,
        isbn: ['1111111111', '2222222222'],
        extra_field: 'ignored'
      }
    ];

    const result = validateAndTransform(docs);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ol_key: '/works/OL123W',
      title: 'Test Book',
      author: 'Author One', // First author only
      first_publish_year: 2020,
      isbn: '1111111111' // First ISBN only
    });
  });

  // Test Case 33: Edge case - transform doc without optional fields
  test('validateAndTransform should handle docs without optional fields', () => {
    const docs = [
      { key: '/works/OL456W', title: 'Minimal Book' }
    ];

    const result = validateAndTransform(docs);

    expect(result).toHaveLength(1);
    expect(result[0].ol_key).toBe('/works/OL456W');
    expect(result[0].title).toBe('Minimal Book');
    expect(result[0].author).toBeUndefined();
    expect(result[0].isbn).toBeUndefined();
  });

  // Test Case 34: Error handling - filter out invalid documents
  test('validateAndTransform should filter out invalid documents', () => {
    const docs = [
      { key: '/works/OL789W', title: 'Valid' },
      { title: 'No Key' },
      { key: '/works/OL000W' }, // No title
      null,
      undefined
    ];

    const result = validateAndTransform(docs.filter(Boolean));

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid');
  });

  // Test Case 35: Edge case - empty array input
  test('validateAndTransform should return empty array for empty input', () => {
    const result = validateAndTransform([]);
    expect(result).toEqual([]);
  });
});

