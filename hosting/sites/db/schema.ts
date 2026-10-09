import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const publications = sqliteTable('publications', {
  id: text('id').primaryKey(), ownerHash: text('owner_hash').notNull(),
  snapshot: text('snapshot'), created: text('created').notNull(),
});
export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull().references(() => publications.id),
  size: integer('size').notNull(), type: text('type').notNull(),
});
export const publicationLimits = sqliteTable('publication_limits', {
  id: text('id').primaryKey(), count: integer('count').notNull(),
});
