/**
 * Tests for LlamaService utility functions.
 * Note: The actual llama.rn inference is not tested here (requires device).
 * We test the prompt-building logic which is pure TypeScript.
 */

// We need to mock llama.rn since it's a native module
jest.mock('llama.rn', () => ({
  initLlama: jest.fn(),
}));

// Import after mock
import {
  isModelLoaded,
} from '../src/services/LlamaService';

describe('LlamaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report model as not loaded initially', () => {
    expect(isModelLoaded()).toBe(false);
  });
});
