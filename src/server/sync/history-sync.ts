import { GscError } from '@/server/gsc/errors'
import { sitesRepo } from '@/server/repositories/sites.repo'
import { fetchAndStoreRange } from './fetch-and-store'
import { planHistoryChunks } from './history-plan'
import { enqueueSiteJob } from './queue'

/**
 * Yeni eklenen bir site için geçmiş veriyi çekmeye başlar.
 *
 * Dilimler en yeniden en eskiye kuyruğa girer, böylece panel 16 ayın
 * tamamını beklemeden işe yarar veriyle açılabilir.
 */
export async function startHistorySync(siteId: string, today = new Date()): Promise<void> {
  await sitesRepo.setStage(siteId, 'fetching_history')

  for (const chunk of planHistoryChunks(today)) {
    await enqueueSiteJob({ kind: 'history', siteId, from: chunk.from, to: chunk.to })
  }
}

export async function runHistorySync(job: {
  siteId: string
  from: string
  to: string
}): Promise<void> {
  const site = await sitesRepo.findForSync(job.siteId)
  if (!site) return

  try {
    await fetchAndStoreRange(site, job.from, job.to)
    await sitesRepo.completeHistoryChunk(site.id, job.from, job.to)
  } catch (error) {
    await sitesRepo.recordSyncFailure(site.id, error instanceof GscError ? error.code : 'unavailable')
    throw error
  }
}
