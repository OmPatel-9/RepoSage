import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'

import { env } from '../../env'

const groq = createGroq({ apiKey: env.GROQ_API_KEY })

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
})

/** Groq llama-3.1-8b-instant — cheap and fast; summaries, titles, simple extraction. */
export function getFastModel() {
  return groq('llama-3.1-8b-instant')
}

/** Groq llama-3.3-70b-versatile — main reasoning model for chat and review. */
export function getSmartModel() {
  return groq('llama-3.3-70b-versatile')
}

/** Google gemini-2.5-flash-lite — fallback when Groq is rate limited or down. */
export function getFallbackFastModel() {
  return google('gemini-2.5-flash-lite')
}

/** Google gemini-2.5-flash — fallback for the smart tier. */
export function getFallbackSmartModel() {
  return google('gemini-2.5-flash')
}
