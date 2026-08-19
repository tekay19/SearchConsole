import { relations } from 'drizzle-orm'
import { date, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

/** Kullanıcıya gösterilen dört durumun veritabanı karşılığı. Eşleme site-status.ts içindedir. */
export const siteStatus = pgEnum('site_status', ['fresh', 'syncing', 'needs_reconnect', 'failed'])

/** "Hazırlanıyor" ekranındaki dört adımın hangisinde olduğumuz. */
export const preparationStage = pgEnum('preparation_stage', [
  'connecting',
  'discovering',
  'fetching_history',
  'ready',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Bağlı bir Google hesabı. Jetonlar AES-256-GCM ile şifreli saklanır;
 * ham hâlleri hiçbir sütuna, günlüğe veya hata mesajına girmez.
 */
export const googleConnections = pgTable(
  'google_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    googleSub: text('google_sub').notNull(),
    googleEmail: text('google_email').notNull(),
    accessTokenEncrypted: text('access_token_encrypted'),
    // Yenileme jetonu olmadan arka planda veri toplayamayız; bu yüzden zorunlu.
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('google_connections_user_sub_key').on(table.userId, table.googleSub)],
)

/**
 * Takip edilen bir web sitesi. `gscProperty` Google'ın tanıdığı ham adrestir
 * ("https://example.com/" ya da "sc-domain:example.com"); kullanıcı bunu
 * asla görmez, ekranda `displayName` gösterilir.
 */
export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => googleConnections.id, { onDelete: 'cascade' }),
    gscProperty: text('gsc_property').notNull(),
    displayName: text('display_name').notNull(),
    permissionLevel: text('permission_level').notNull(),
    status: siteStatus('status').notNull().default('syncing'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('sites_user_property_key').on(table.userId, table.gscProperty),
    index('sites_user_idx').on(table.userId),
  ],
)

export const siteSyncState = pgTable('site_sync_state', {
  siteId: uuid('site_id')
    .primaryKey()
    .references(() => sites.id, { onDelete: 'cascade' }),
  stage: preparationStage('stage').notNull().default('connecting'),
  /** Veri toplamanın ilerlediği son gün. Bir sonraki tur buradan geriye pencere bırakarak başlar. */
  lastSyncedDate: date('last_synced_date'),
  /** Geçmiş veri almanın ulaştığı en eski gün. */
  historyStartDate: date('history_start_date'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  lastErrorCode: text('last_error_code'),
})

export const usersRelations = relations(users, ({ many }) => ({
  sites: many(sites),
  connections: many(googleConnections),
}))

export const googleConnectionsRelations = relations(googleConnections, ({ one, many }) => ({
  user: one(users, { fields: [googleConnections.userId], references: [users.id] }),
  sites: many(sites),
}))

export const sitesRelations = relations(sites, ({ one }) => ({
  user: one(users, { fields: [sites.userId], references: [users.id] }),
  connection: one(googleConnections, {
    fields: [sites.connectionId],
    references: [googleConnections.id],
  }),
  syncState: one(siteSyncState, { fields: [sites.id], references: [siteSyncState.siteId] }),
}))

export const siteSyncStateRelations = relations(siteSyncState, ({ one }) => ({
  site: one(sites, { fields: [siteSyncState.siteId], references: [sites.id] }),
}))
