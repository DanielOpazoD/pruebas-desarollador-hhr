/**
 * AI-Enhanced CIE-10 Search Service
 *
 * Security model:
 * - Browser only calls serverless endpoint
 * - Gemini API key is stored server-side only
 */

import { CIE10Entry } from './cie10SpanishDatabase';
import { aiRequestManager } from '../ai/aiRequestManager';

// Track AI availability
let aiAvailabilityChecked = false;
let aiIsAvailable = false;

/**
 * Check if AI search is available
 */
export function isAIAvailable(): boolean {
  return aiIsAvailable;
}

/**
 * Search CIE-10 using Netlify serverless function
 */
async function searchWithServerlessFunction(
  query: string,
  signal?: AbortSignal
): Promise<{ available: boolean; results: CIE10Entry[] }> {
  try {
    const response = await fetch('/.netlify/functions/cie10-ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!response.ok) {
      return { available: false, results: [] };
    }

    const data = await response.json();
    return {
      available: data.available === true,
      results: data.results || [],
    };
  } catch {
    return { available: false, results: [] };
  }
}

/**
 * Searches for CIE-10 codes using Gemini AI via serverless endpoint.
 */
export async function searchCIE10WithAI(
  query: string,
  signal?: AbortSignal
): Promise<CIE10Entry[]> {
  if (!query || query.length < 2) return [];

  return aiRequestManager.enqueue(
    `cie10-${query}`,
    async innerSignal => {
      const serverlessResult = await searchWithServerlessFunction(query, innerSignal || signal);

      if (serverlessResult.available) {
        aiAvailabilityChecked = true;
        aiIsAvailable = true;
        return serverlessResult.results;
      }

      aiAvailabilityChecked = true;
      aiIsAvailable = false;
      return [];
    },
    signal
  );
}

/**
 * Check AI availability
 */
export async function checkAIAvailability(): Promise<boolean> {
  if (aiAvailabilityChecked) {
    return aiIsAvailable;
  }

  try {
    const response = await fetch('/.netlify/functions/cie10-ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });

    if (response.ok) {
      const data = await response.json();
      const isAvailable = data.available === true;
      aiAvailabilityChecked = true;
      aiIsAvailable = isAvailable;
      return isAvailable;
    }
  } catch {
    // Serverless unavailable
  }

  aiAvailabilityChecked = true;
  aiIsAvailable = false;
  return false;
}
