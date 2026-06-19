import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers'

import { logger } from './logger'

/** Embedding model. bge-small-en-v1.5 outputs 384-dim vectors (matches schema). */
const MODEL = 'Xenova/bge-small-en-v1.5'

/** Embedding dimension, must match the vector(384) column. */
export const EMBEDDING_DIM = 384

/** Texts per forward pass. */
export const EMBED_BATCH_SIZE = 8

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null

/**
 * Lazily loads the embedding model once per process. The first call downloads
 * the model (~30s); subsequent calls reuse the in-memory pipeline.
 */
export async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    logger.info({ model: MODEL }, 'embeddings: loading model (first call ~30s)')
    const startedAt = Date.now()
    embedderPromise = pipeline('feature-extraction', MODEL).then((pipe) => {
      logger.info(
        { model: MODEL, loadMs: Date.now() - startedAt },
        'embeddings: model ready',
      )
      return pipe
    })
  }
  return embedderPromise
}

/**
 * Embeds an arbitrary number of texts, internally batching in groups of 8.
 * Returns one Float32Array per input text, in order.
 */
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return []
  const embedder = await getEmbedder()
  const out: Float32Array[] = []

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE)
    const tensor = await embedder(batch, { pooling: 'mean', normalize: true })
    // tensor shape: [batch, EMBEDDING_DIM]. tolist() -> number[][].
    const rows = tensor.tolist() as number[][]
    for (const row of rows) {
      out.push(Float32Array.from(row))
    }
  }

  return out
}
