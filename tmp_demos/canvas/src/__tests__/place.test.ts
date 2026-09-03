import { describe, expect, it } from 'vitest';
import { layout } from '../layout';
import { cellFromPoint, nextChildSlot, nextTopLevelCell, occupied } from '../place';
import { seedState } from '../seed';
import type { Block } from '../types';

const state = seedState();
const placed = layout(state);

describe('occupied', () => {
    it('detects overlap with a major block footprint', () => {
        expect(occupied(state.blocks, 1, 2, 1)).toBe(true);
        expect(occupied(state.blocks, 3, 1, 1)).toBe(false);
        expect(occupied(state.blocks, 3, 1, 3)).toBe(true);
    });
});

describe('nextTopLevelCell', () => {
    it('places a minor block in the first free cell right of the focused step', () => {
        expect(nextTopLevelCell(state, 'minor', placed)).toEqual({ col: 3, row: 1 });
    });

    it('places a major block past the neighbouring step when the gap is too small', () => {
        expect(nextTopLevelCell(state, 'major', placed)).toEqual({ col: 27, row: 1 });
    });

    it('uses the top-level ancestor when a nested child is focused', () => {
        const nested = { ...state, focusedId: 'step-3-a' };
        expect(nextTopLevelCell(nested, 'minor', placed)).toEqual({ col: 11, row: 1 });
    });

    it('starts at the origin when nothing is focused and the canvas is empty', () => {
        expect(nextTopLevelCell({ version: 1, blocks: [], focusedId: null }, 'major', [])).toEqual({ col: 0, row: 0 });
    });
});

describe('nextChildSlot', () => {
    it('returns the first free slot in row-major order', () => {
        const step3 = state.blocks.find((b) => b.id === 'step-3');
        expect(step3 && nextChildSlot(step3)).toEqual({ col: 2, row: 0 });
    });

    it('returns null when all nine slots are taken', () => {
        const children: Block[] = [];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                children.push({ id: `c${r}${c}`, kind: 'minor', color: 'slate', text: '', col: c, row: r, children: [] });
            }
        }
        const full: Block = { id: 'full', kind: 'major', color: 'slate', text: '', col: 0, row: 0, children };
        expect(nextChildSlot(full)).toBeNull();
    });
});

describe('cellFromPoint', () => {
    it('maps layer pixels back to grid cells', () => {
        expect(cellFromPoint(10, 10)).toEqual({ col: 0, row: 0 });
        expect(cellFromPoint(176 * 4 + 5, 176 * 2 + 5)).toEqual({ col: 4, row: 2 });
    });
});
