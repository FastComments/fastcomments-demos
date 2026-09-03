import { describe, expect, it } from 'vitest';
import { isCanvasState, normalizeState } from '../storage';
import { seedState } from '../seed';

describe('isCanvasState', () => {
    it('accepts the seed', () => {
        expect(isCanvasState(seedState())).toBe(true);
    });

    it('rejects malformed payloads', () => {
        expect(isCanvasState(null)).toBe(false);
        expect(isCanvasState({ version: 2, blocks: [], focusedId: null })).toBe(false);
        expect(isCanvasState({ version: 1, blocks: [{ id: 'x' }], focusedId: null })).toBe(false);
        expect(isCanvasState({ version: 1, blocks: [{ id: 'x', kind: 'huge', color: 'slate', text: '', col: 0, row: 0, children: [] }], focusedId: null })).toBe(false);
    });
});

describe('normalizeState', () => {
    it('nulls a focusedId that points at a missing block', () => {
        const s = seedState();
        s.focusedId = 'gone';
        expect(normalizeState(s).focusedId).toBeNull();
    });

    it('keeps a focusedId that points at a nested block', () => {
        const s = seedState();
        s.focusedId = 'step-3-a';
        expect(normalizeState(s).focusedId).toBe('step-3-a');
    });
});
