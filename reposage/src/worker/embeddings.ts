import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers'

/** Embedding model. bge-small-en-v1.5 outputs 384-dim vectors (matches schema). */
const MODEL = 'Xenova/bge-small-en-v1.5'

/** Embedding dimension, must match the vector(384) column. */
export const EMBEDDING_DIM = 384

/** Texts per forward pass. */
export const EMBED_BATCH_SIZE = 8

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null

/**
 * Lazily loads the embedding model once per process. The first call downloads
 * the model (~30s); subsequent calls reuse the in-memory pipeline. Uses
 * console logging (no pino) so it is safe to import from Next.js routes too.
 */
export async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    console.log(`[embeddings] loading ${MODEL} (first call ~30s)`)
    const startedAt = Date.now()
    embedderPromise = pipeline('feature-extraction', MODEL).then((pipe) => {
      console.log(`[embeddings] model ready in ${Date.now() - startedAt}ms`)
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
    const rows = tensor.tolist() as number[][]
    for (const row of rows) {
      out.push(Float32Array.from(row))
    }
  }

  return out
}

/** Convenience: embed a single text and return its vector. */
export async function embedOne(text: string): Promise<Float32Array> {
  const [vector] = await embedBatch([text])
  if (!vector) throw new Error('Embedding produced no vector')
  return vector
}
