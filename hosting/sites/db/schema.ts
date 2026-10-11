import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const publications = sqliteTable('publications', {
  id: text('id').primaryKey(), ownerHash: text('owner_hash').notNull(),
  snapshot: text('snapshot'), accessHash: text('access_hash'), accessSalt: text('access_salt'), diaryEmail: text('diary_email'), recipientId: text('recipient_id'), created: text('created').notNull(),
});
export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull().references(() => publications.id),
  size: integer('size').notNull(), type: text('type').notNull(),
});
export const publicationLimits = sqliteTable('publication_limits', {
  id: text('id').primaryKey(), count: integer('count').notNull(),
});

export const guestSessions = sqliteTable('guest_sessions', {
  tokenHash: text('token_hash').primaryKey(), siteId: text('site_id').notNull().references(() => publications.id),
  accessHash: text('access_hash').notNull(), expires: integer('expires').notNull(),
});
export const diaryEntries = sqliteTable('diary_entries', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull().references(() => publications.id),
  userId: text('user_id').notNull(), body: text('body').notNull(), created: text('created').notNull(), updated: text('updated').notNull(),
});

export const wishCapsules = sqliteTable('wish_capsules', {
  id: text('id').primaryKey(), siteId: text('site_id').notNull().references(() => publications.id),
  userId: text('user_id').notNull(), body: text('body').notNull(), created: text('created').notNull(), unlockAt: integer('unlock_at').notNull(),
});
