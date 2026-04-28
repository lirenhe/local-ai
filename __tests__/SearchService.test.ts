/**
 * Tests for SearchService – pure TypeScript logic (no network calls).
 */

import { formatSearchContext } from '../src/services/SearchService';
import type { SearchResult } from '../src/types';

describe('SearchService', () => {
  describe('formatSearchContext', () => {
    it('returns empty string for no results', () => {
      expect(formatSearchContext([])).toBe('');
    });

    it('formats results with title, url, and snippet', () => {
      const results: SearchResult[] = [
        {
          title: 'React Native',
          url: 'https://reactnative.dev',
          snippet: 'A framework for building native apps.',
        },
      ];
      const output = formatSearchContext(results);
      expect(output).toContain('[1] React Native');
      expect(output).toContain('URL: https://reactnative.dev');
      expect(output).toContain('A framework for building native apps.');
      expect(output).toContain('### Web Search Results');
    });

    it('numbers multiple results correctly', () => {
      const results: SearchResult[] = [
        { title: 'First', url: 'https://first.com', snippet: 'First snippet' },
        { title: 'Second', url: 'https://second.com', snippet: 'Second snippet' },
        { title: 'Third', url: 'https://third.com', snippet: 'Third snippet' },
      ];
      const output = formatSearchContext(results);
      expect(output).toContain('[1] First');
      expect(output).toContain('[2] Second');
      expect(output).toContain('[3] Third');
    });

    it('includes citation guidance in the output', () => {
      const results: SearchResult[] = [
        { title: 'Test', url: 'https://test.com', snippet: 'Test snippet' },
      ];
      const output = formatSearchContext(results);
      expect(output).toContain('Cite sources where relevant');
    });
  });
});
