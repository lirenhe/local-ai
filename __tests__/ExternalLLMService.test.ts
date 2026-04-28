/**
 * Tests for ExternalLLMService – tests the URL-building and header-generation logic.
 * Network calls are mocked via axios.
 */

jest.mock('axios');

import axios from 'axios';
import { chatCompletion, testConnection, listModels } from '../src/services/ExternalLLMService';
import type { ExternalLLMConfig } from '../src/types';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const TEST_CONFIG: ExternalLLMConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  model: 'gpt-3.5-turbo',
};

describe('ExternalLLMService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chatCompletion', () => {
    it('calls the correct endpoint with messages', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { role: 'assistant', content: ' Hello! ' }, finish_reason: 'stop' }],
        },
      });

      const result = await chatCompletion(
        [{ role: 'user', content: 'Hi' }],
        TEST_CONFIG,
      );

      expect(result).toBe('Hello!');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('strips trailing slash from baseUrl', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }] },
      });

      await chatCompletion([{ role: 'user', content: 'Hi' }], {
        ...TEST_CONFIG,
        baseUrl: 'https://api.openai.com/v1/',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.anything(),
        expect.anything(),
      );
    });

    it('does not include Authorization header when apiKey is empty', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }] },
      });

      await chatCompletion([{ role: 'user', content: 'Hi' }], {
        ...TEST_CONFIG,
        apiKey: '',
      });

      const headers = (mockedAxios.post.mock.calls[0][2] as { headers: Record<string, string> }).headers;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('testConnection', () => {
    it('returns ok:true on success', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }] },
      });
      const result = await testConnection(TEST_CONFIG);
      expect(result).toEqual({ ok: true });
    });

    it('returns ok:false with error message on failure', async () => {
      const error = {
        message: 'Network error',
        response: { data: { error: { message: 'Invalid API key' } } },
      };
      mockedAxios.post.mockRejectedValueOnce(error);
      const result = await testConnection(TEST_CONFIG);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('listModels', () => {
    it('returns sorted model IDs', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' },
            { id: 'gpt-4-turbo' },
          ],
        },
      });

      const models = await listModels(TEST_CONFIG);
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
    });

    it('returns empty array on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const models = await listModels(TEST_CONFIG);
      expect(models).toEqual([]);
    });
  });
});
