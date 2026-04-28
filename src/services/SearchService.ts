/**
 * SearchService – performs a web search and returns structured results.
 *
 * Strategy (no API key required):
 *  1. Primary:  DuckDuckGo Instant Answer JSON API (no auth, CORS-friendly).
 *  2. Fallback: Scrape DuckDuckGo HTML results (simple parse).
 *
 * The search results are returned as {title, url, snippet} objects that can be
 * injected into the LLM prompt as grounding context.
 */

import axios from 'axios';
import type { SearchResult } from '../types';

const DDG_INSTANT_URL = 'https://api.duckduckgo.com/';
const DDG_HTML_URL = 'https://html.duckduckgo.com/html/';

const DEFAULT_MAX_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 8000;

// ─── DuckDuckGo Instant Answer API ───────────────────────────────────────────

interface DDGInstantResult {
  AbstractText?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
    Name?: string;
    Topics?: Array<{ Text?: string; FirstURL?: string }>;
  }>;
}

async function searchDDGInstant(query: string, maxResults: number): Promise<SearchResult[]> {
  const response = await axios.get<DDGInstantResult>(DDG_INSTANT_URL, {
    params: {
      q: query,
      format: 'json',
      no_html: 1,
      no_redirect: 1,
      skip_disambig: 1,
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const data = response.data;
  const results: SearchResult[] = [];

  // Abstract (top answer)
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.AbstractSource ?? query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  // Related topics
  const topics = data.RelatedTopics ?? [];
  for (const topic of topics) {
    if (results.length >= maxResults) break;
    // Nested group
    if (topic.Topics) {
      for (const sub of topic.Topics) {
        if (results.length >= maxResults) break;
        if (sub.Text && sub.FirstURL) {
          results.push({
            title: topic.Name ?? query,
            url: sub.FirstURL,
            snippet: sub.Text,
          });
        }
      }
    } else if (topic.Text && topic.FirstURL) {
      results.push({
        title: query,
        url: topic.FirstURL,
        snippet: topic.Text,
      });
    }
  }

  return results;
}

// ─── DuckDuckGo HTML fallback ─────────────────────────────────────────────────

async function searchDDGHtml(query: string, maxResults: number): Promise<SearchResult[]> {
  const response = await axios.post<string>(
    DDG_HTML_URL,
    new URLSearchParams({ q: query, kl: 'us-en' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  const html: string = response.data;
  const results: SearchResult[] = [];

  // Lightweight regex-based extraction – no DOM parser needed in RN
  const resultBlockRe =
    /<div class="result__body"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>.*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gs;

  let match: RegExpExecArray | null;
  while ((match = resultBlockRe.exec(html)) !== null) {
    if (results.length >= maxResults) break;
    const url = decodeURIComponent(match[1] ?? '').replace(/^\/\/duckduckgo.com\/l\/\?uddg=/, '');
    const title = stripHtml(match[2] ?? '');
    const snippet = stripHtml(match[3] ?? '');
    if (url && title) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search the web and return up to `maxResults` results.
 * Tries the DuckDuckGo Instant Answer API first; falls back to HTML scraping.
 */
export async function searchWeb(
  query: string,
  maxResults = DEFAULT_MAX_RESULTS,
): Promise<SearchResult[]> {
  try {
    const results = await searchDDGInstant(query, maxResults);
    if (results.length > 0) return results;
  } catch (_e) {
    // Instant API failed – try HTML fallback
  }

  try {
    return await searchDDGHtml(query, maxResults);
  } catch (_e) {
    return [];
  }
}

/**
 * Format search results into a concise context block for injection into a prompt.
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const lines = results.map(
    (r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`,
  );

  return `### Web Search Results\n\n${lines.join('\n\n')}\n\n---\nUse the above results to answer the question accurately. Cite sources where relevant.`;
}
