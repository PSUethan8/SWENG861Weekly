// backend/books/bookRoutes.js
import { Router } from 'express';
import Book from './Book.js';

const router = Router();

/**
 * Middleware to initialize user's book list if they don't have one yet.
 * Copies all master books (userId: null) to the user's personal list.
 */
async function ensureUserBooks(req, res, next) {
  try {
    const userId = req.user.id;
    const userBookCount = await Book.countDocuments({ userId });
    
    if (userBookCount === 0) {
      // User has no books yet - copy from master list
      const masterBooks = await Book.find({ userId: null });
      if (masterBooks.length > 0) {
        const userBooks = masterBooks.map(mb => ({
          ol_key: mb.ol_key,
          title: mb.title,
          author: mb.author,
          first_publish_year: mb.first_publish_year,
          isbn: mb.isbn,
          userId: userId,
        }));
        await Book.insertMany(userBooks);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Apply ensureUserBooks to all routes
router.use(ensureUserBooks);

// GET all books for current user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const books = await Book.find({ userId }).sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// GET one by Mongo _id (must belong to user)
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const book = await Book.findOne({ _id: req.params.id, userId });
    if (!book) return res.status(404).json({ error: 'Not found' });
    res.json(book);
  } catch (err) {
    next(err);
  }
});

// CREATE a book for current user
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const book = await Book.create({ ...req.body, userId });
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

// UPDATE a book (must belong to user)
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Prevent changing userId
    const { userId: _, ...updates } = req.body;
    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );
    if (!book) return res.status(404).json({ error: 'Not found' });
    res.json(book);
  } catch (err) {
    next(err);
  }
});

// DELETE a book (must belong to user)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const book = await Book.findOneAndDelete({ _id: req.params.id, userId });
    if (!book) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
