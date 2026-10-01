import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const workspace=sqliteTable('workspace',{id:text('id').primaryKey(),revision:integer('revision').notNull(),payload:text('payload').notNull(),actor:text('actor').notNull(),updatedAt:text('updated_at').notNull()});
export const runs=sqliteTable('shared_runs',{id:text('id').primaryKey(),at:text('at').notNull(),payload:text('payload').notNull()});
export const tasks=sqliteTable('shared_tasks',{id:text('id').primaryKey(),payload:text('payload').notNull()});
export const operations=sqliteTable('operations',{key:text('key').primaryKey(),revision:integer('revision').notNull(),payload:text('payload').notNull()});
