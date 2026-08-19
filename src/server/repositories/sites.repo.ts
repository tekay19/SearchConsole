import { and, eq, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { googleConnections, siteSyncState, sites } from '@/server/db/schema'
import type { PreparationStage } from '@/server/db/schema'

export type SiteRow = typeof sites.$inferSelect

export type SiteForSync = {
  id: string
  connectionId: string
  gscProperty: string
  lastSyncedDate: string | null
}

export type SiteWithState = SiteRow & {
  stage: PreparationStage
  lastErrorCode: string | null
  consecutiveFailures: number
  lastSuccessAt: Date | null
}

export const sitesRepo = {
  /** Toplama işinin ihtiyaç duyduğu asgari bilgi. */
  async findForSync(siteId: string): Promise<SiteForSync | null> {
    const [row] = await db
      .select({
        id: sites.id,
        connectionId: sites.connectionId,
        gscProperty: sites.gscProperty,
        lastSyncedDate: siteSyncState.lastSyncedDate,
      })
      .from(sites)
      .leftJoin(siteSyncState, eq(siteSyncState.siteId, sites.id))
      .where(eq(sites.id, siteId))
      .limit(1)

    return row ?? null
  },

  async listForUser(userId: string): Promise<SiteWithState[]> {
    return db
      .select({
        id: sites.id,
        userId: sites.userId,
        connectionId: sites.connectionId,
        gscProperty: sites.gscProperty,
        displayName: sites.displayName,
        permissionLevel: sites.permissionLevel,
        status: sites.status,
        createdAt: sites.createdAt,
        stage: siteSyncState.stage,
        lastErrorCode: siteSyncState.lastErrorCode,
        consecutiveFailures: siteSyncState.consecutiveFailures,
        lastSuccessAt: siteSyncState.lastSuccessAt,
      })
      .from(sites)
      .innerJoin(siteSyncState, eq(siteSyncState.siteId, sites.id))
      .where(eq(sites.userId, userId))
      .orderBy(sites.displayName) as Promise<SiteWithState[]>
  },

  /**
   * Günlük turda denenecek siteler.
   *
   * Bağlantısı iptal edilmiş ya da yetki sorunu bilinen siteler dışarıda
   * kalır — kullanıcı bağlantıyı yenileyene kadar Google'a gitmek hem
   * kotayı harcar hem de hiçbir şey düzeltmez.
   */
  async listSyncableIds(): Promise<string[]> {
    const rows = await db
      .select({ id: sites.id })
      .from(sites)
      .innerJoin(googleConnections, eq(googleConnections.id, sites.connectionId))
      .innerJoin(siteSyncState, eq(siteSyncState.siteId, sites.id))
      .where(
        and(
          isNull(googleConnections.revokedAt),
          or(isNull(siteSyncState.lastErrorCode), ne(siteSyncState.lastErrorCode, 'needs_reconnect')),
        ),
      )

    return rows.map((row) => row.id)
  },

  /** Seçilen siteleri ekler; zaten ekli olanları yok sayar. */
  async insertMany(
    values: readonly (typeof sites.$inferInsert)[],
  ): Promise<Array<{ id: string; displayName: string }>> {
    if (values.length === 0) return []

    const inserted = await db
      .insert(sites)
      .values([...values])
      .onConflictDoNothing({ target: [sites.userId, sites.gscProperty] })
      .returning({ id: sites.id, displayName: sites.displayName })

    if (inserted.length > 0) {
      await db
        .insert(siteSyncState)
        .values(inserted.map((row) => ({ siteId: row.id })))
        .onConflictDoNothing()
    }

    return inserted
  },

  async setStage(siteId: string, stage: PreparationStage): Promise<void> {
    await db.update(siteSyncState).set({ stage }).where(eq(siteSyncState.siteId, siteId))
  },

  async recordSyncSuccess(siteId: string, lastSyncedDate: string): Promise<void> {
    await db
      .update(siteSyncState)
      .set({
        lastSyncedDate,
        lastSuccessAt: new Date(),
        lastAttemptAt: new Date(),
        consecutiveFailures: 0,
        lastErrorCode: null,
      })
      .where(eq(siteSyncState.siteId, siteId))

    await db.update(sites).set({ status: 'fresh' }).where(eq(sites.id, siteId))
  },

  async recordSyncFailure(siteId: string, code: string): Promise<void> {
    await db
      .update(siteSyncState)
      .set({
        lastAttemptAt: new Date(),
        lastErrorCode: code,
        consecutiveFailures: sql`${siteSyncState.consecutiveFailures} + 1`,
      })
      .where(eq(siteSyncState.siteId, siteId))
  },

  /**
   * Bir geçmiş dilimi tamamlandı.
   *
   * `historyStartDate` geriye doğru genişler — dilimler sırasız bitebileceği
   * için her zaman en küçüğü tutuyoruz.
   *
   * Site, 16 ayın tamamı inince değil **en yeni dilim inince** hazır sayılır.
   * Kullanıcının verisini görmek için bir buçuk yıllık geçmişi beklemesi
   * gereksiz; kalan aylar arkada dolarken panel çalışır durumda olur.
   * `greatest` sayesinde eski bir dilim geç bitse de son tarihi geri almaz.
   */
  async completeHistoryChunk(siteId: string, from: string, to: string): Promise<void> {
    await db
      .update(siteSyncState)
      .set({
        historyStartDate: sql`least(coalesce(${siteSyncState.historyStartDate}, ${from}), ${from})`,
        lastSyncedDate: sql`greatest(coalesce(${siteSyncState.lastSyncedDate}, ${to}), ${to})`,
        lastSuccessAt: new Date(),
        lastAttemptAt: new Date(),
        consecutiveFailures: 0,
        lastErrorCode: null,
        stage: 'ready',
      })
      .where(eq(siteSyncState.siteId, siteId))

    await db.update(sites).set({ status: 'fresh' }).where(eq(sites.id, siteId))
  },
}
