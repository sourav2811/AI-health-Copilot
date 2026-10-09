import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 id:text('id').primaryKey(), userId:text('user_id').notNull(), data:text('data').notNull(), filename:text('filename').notNull(),
 objectKey:text('object_key'), mime:text('mime'), hash:text('hash').notNull(), reviewed:integer('reviewed').notNull().default(0),
 createdAt:text('created_at').notNull(), model:text('model').notNull(),
}, t=>[index('idx_records_user_created').on(t.userId,t.createdAt),uniqueIndex('idx_records_user_hash').on(t.userId,t.hash)]);
export const usage = sqliteTable('usage', {userId:text('user_id').notNull(),day:text('day').notNull(),count:integer('count').notNull().default(0)},t=>[uniqueIndex('idx_usage_user_day').on(t.userId,t.day)]);
export const profiles = sqliteTable('profiles',{userId:text('user_id').primaryKey(),mockAbha:integer('mock_abha').notNull().default(0)});
