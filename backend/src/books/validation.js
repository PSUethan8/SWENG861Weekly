// backend/books/validation.js
import Joi from 'joi';

const olBookSchema = Joi.object({
  key: Joi.string().required(),         // e.g. "/works/OL82563W"
  title: Joi.string().required(),
  author_name: Joi.array().items(Joi.string()).optional(),
  first_publish_year: Joi.number().optional(),
  isbn: Joi.array().items(Joi.string()).optional(),
});

export function validateAndTransform(docs) {
  const cleaned = [];
  for (const doc of docs) {
    const { error, value } = olBookSchema.validate(doc, { allowUnknown: true });
    if (!error) {
      cleaned.push({
        ol_key: value.key,
        title: value.title,
        author: value.author_name ? value.author_name[0] : undefined,
        first_publish_year: value.first_publish_year,
        isbn: value.isbn ? value.isbn[0] : undefined,
      });
    }
  }
  return cleaned;
}
