// backend/books/Book.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const bookSchema = new Schema(
  {
    ol_key: { type: String, required: true }, // from Open Library doc.key
    title: { type: String, required: true },
    author: { type: String },
    first_publish_year: { type: Number },
    isbn: { type: String },
    userId: { type: String, default: null }, // null = master list, otherwise Prisma user.id
  },
  { timestamps: true }
);

// Compound unique index: ol_key must be unique per user (including null for master)
bookSchema.index({ ol_key: 1, userId: 1 }, { unique: true });

const Book = model('Book', bookSchema);

// Drop the old ol_key_1 unique index if it exists (migration from old schema)
// This runs once when the model is first used
Book.collection.dropIndex('ol_key_1').catch(() => {
  // Index doesn't exist or already dropped - this is fine
});

export default Book;
