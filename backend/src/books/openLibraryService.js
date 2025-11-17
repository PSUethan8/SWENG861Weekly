// backend/books/openLibraryService.js
import axios from 'axios';

export async function searchBooks(query) {
  const res = await axios.get('https://openlibrary.org/search.json', {
    params: { q: query },
  });
  // returns { start, num_found, docs: [...] }
  return res.data;
}
