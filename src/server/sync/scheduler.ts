import { sitesRepo } from '@/server/repositories/sites.repo'
import { enqueueSiteJob, siteQueue } from './queue'

const TIME_ZONE = 'Europe/Istanbul'

/**
 * Bakım günlük turdan önce çalışır: bölümler açılmadan veri yazmak
 * Postgres hatasıdır. Aradaki iki saat, bakım uzun sürse bile turun
 * hazır bir veritabanına düşmesini garanti eder.
 */
const MAINTENANCE_AT = '0 3 * * *'
const DAILY_FANOUT_AT = '0 5 * * *'

/** Toplanabilir her site için günlük iş açar; eklenen iş sayısını döndürür. */
export async function enqueueAllDailySyncs(): Promise<number> {
  const siteIds = await sitesRepo.listSyncableIds()

  for (const siteId of siteIds) {
    await enqueueSiteJob({ kind: 'daily', siteId })
  }

  return siteIds.length
}

/**
 * Tekrarlayan işleri kaydeder. Aynı adla tekrar çağrılması güvenlidir;
 * işçi süreç her açılışta çağırır.
 */
export async function registerSchedules(): Promise<void> {
  await siteQueue.upsertJobScheduler(
    'maintenance',
    { pattern: MAINTENANCE_AT, tz: TIME_ZONE },
    { name: 'maintenance', data: { kind: 'maintenance' } },
  )

  await siteQueue.upsertJobScheduler(
    'daily-fanout',
    { pattern: DAILY_FANOUT_AT, tz: TIME_ZONE },
    { name: 'fanout', data: { kind: 'fanout' } },
  )
}
