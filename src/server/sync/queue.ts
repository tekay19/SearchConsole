import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/server/env'
import { jobIdFor, type QueueJob, type SiteJob } from './jobs'

export const SITE_QUEUE = 'site-jobs'

/**
 * Google dakikada 1.200 istek kabul eder. Saniyede 10, bunun güvenli
 * altında kalır ve tek bir sınırlayıcı tüm işçileri kapsar — kaç süreç
 * çalıştırırsak çalıştıralım Google'a giden hız sabit.
 */
export const GOOGLE_REQUESTS_PER_SECOND = 10

/** Aynı anda kaç site işlenir. Hız sınırı zaten üstte; bu sadece eşzamanlılık. */
export const WORKER_CONCURRENCY = 5

const globalForQueue = globalThis as unknown as {
  __spRedis?: IORedis
  __spQueue?: Queue<QueueJob>
}

/**
 * maxRetriesPerRequest: null — BullMQ'nun beklediği ayar. Bloklayan
 * komutlar süresiz beklemeli, yoksa işçi Redis kesintisinde çöker.
 */
export const connection = (globalForQueue.__spRedis ??= new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
}))

export const siteQueue = (globalForQueue.__spQueue ??= new Queue<QueueJob>(SITE_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    // Google'ın hız sınırı dakikalık pencerelerde sıfırlanır; ilk yeniden
    // deneme 30 saniye sonra, sonrakiler katlanarak.
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { age: 86_400, count: 5_000 },
    removeOnFail: { age: 604_800 },
  },
}))

/** Kuyruğa iş ekler. Aynı iş zaten varsa BullMQ yenisini eklemez. */
export async function enqueueSiteJob(job: SiteJob): Promise<void> {
  await siteQueue.add(job.kind, job, { jobId: jobIdFor(job) })
}
