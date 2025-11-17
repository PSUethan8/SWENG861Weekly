// backend/books/importBooks.js
import { searchBooks } from './openLibraryService.js';
import { validateAndTransform } from './validation.js';
import Book from './Book.js';

export async function importBooksFromOpenLibrary(query = 'javascript') {
  const data = await searchBooks(query);
  const docs = data.docs || [];
  const books = validateAndTransform(docs);

  // upsert to avoid duplicates
  for (const b of books) {
    await Book.updateOne(
      { ol_key: b.ol_key },
      { $set: b },
      { upsert: true }
    );
  }

  return books.length;
}
