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

export default model('Book', bookSchema);
