import { Worker } from 'bullmq'
import type { QueueJob } from '@/server/sync/jobs'
import {
  GOOGLE_REQUESTS_PER_SECOND,
  SITE_QUEUE,
  WORKER_CONCURRENCY,
  connection,
  siteQueue,
} from '@/server/sync/queue'
import { runDailySync } from '@/server/sync/daily-sync'
import { runHistorySync } from '@/server/sync/history-sync'
import { runMaintenance } from '@/server/sync/maintenance'
import { enqueueAllDailySyncs, registerSchedules } from '@/server/sync/scheduler'

/**
 * Veriyi toplayan ayrı süreç.
 *
 * Web sürecinden ayrı çalışır: bir site için geçmiş veri çekmek dakikalar
 * sürebilir ve bunu istek içinde yapmak hem zaman aşımına uğrar hem de
 * kullanıcıyı bekletir.
 */
const worker = new Worker<QueueJob>(
  SITE_QUEUE,
  async (job) => {
    switch (job.data.kind) {
      case 'daily':
        return runDailySync(job.data)

      case 'history':
        return runHistorySync(job.data)

      case 'fanout': {
        const count = await enqueueAllDailySyncs()
        console.log(`[worker] gunluk tur: ${count} site kuyruga eklendi`)
        return
      }

      case 'maintenance':
        await runMaintenance()
        console.log('[worker] bakim tamamlandi')
        return
    }
  },
  {
    connection,
    concurrency: WORKER_CONCURRENCY,
    // Hız sınırı kuyruk düzeyinde: kaç işçi süreç açarsak açalım
    // Google'a giden toplam hız sabit kalır.
    limiter: { max: GOOGLE_REQUESTS_PER_SECOND, duration: 1_000 },
  },
)

worker.on('failed', (job, error) => {
  console.error(`[worker] ${job?.id ?? 'bilinmeyen is'} basarisiz: ${error.message}`)
})

worker.on('ready', () => {
  console.log('[worker] hazir, is bekleniyor')
})

await registerSchedules()

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} alindi, kapaniyor`)
  await worker.close()
  await siteQueue.close()
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
