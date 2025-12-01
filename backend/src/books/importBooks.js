// backend/books/importBooks.js
import { searchBooks } from './openLibraryService.js';
import { validateAndTransform } from './validation.js';
import Book from './Book.js';

/**
 * Import books from Open Library into a user's personal list.
 * @param {string} query - Search query for Open Library
 * @param {string|null} userId - User ID to import for (null = master list)
 */
export async function importBooksFromOpenLibrary(query = 'javascript', userId = null) {
  const data = await searchBooks(query);
  const docs = data.docs || [];
  const books = validateAndTransform(docs);

  // upsert to avoid duplicates within the user's list
  for (const b of books) {
    await Book.updateOne(
      { ol_key: b.ol_key, userId },
      { $set: { ...b, userId } },
      { upsert: true }
    );
  }

  return books.length;
}
