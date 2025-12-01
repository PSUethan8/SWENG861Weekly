// backend/books/Book.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const bookSchema = new Schema(
  {
    ol_key: { type: String, required: true, unique: true }, // from Open Library doc.key
    title: { type: String, required: true },
    author: { type: String },
    first_publish_year: { type: Number },
    isbn: { type: String },
  },
  { timestamps: true }
);

export default model('Book', bookSchema);
