import { describe, expect, it } from 'vitest';
import { dropTarget } from '../drag';
import { layout, PITCH } from '../layout';
import { seedState } from '../seed';

const state = seedState();
const placed = layout(state);

describe('dropTarget (top-level)', () => {
    it('snaps a minor block one pitch to the right into a free cell', () => {
        expect(dropTarget(placed, state, 'note-1-owner', PITCH + 20, 5)).toEqual({ cell: { col: 1, row: 0 }, valid: true });
    });

    it('rounds to the nearest cell rather than flooring', () => {
        expect(dropTarget(placed, state, 'note-1-owner', PITCH * 0.6, 0)).toEqual({ cell: { col: 1, row: 0 }, valid: true });
        expect(dropTarget(placed, state, 'note-1-owner', PITCH * 0.4, 0)).toEqual({ cell: { col: 0, row: 0 }, valid: true });
    });

    it('rejects a major block dropped onto another block footprint', () => {
        expect(dropTarget(placed, state, 'step-1', PITCH * 3, 0)).toEqual({ cell: { col: 3, row: 1 }, valid: false });
    });

    it('clamps to the positive quadrant', () => {
        expect(dropTarget(placed, state, 'note-1-owner', -PITCH * 2, -PITCH * 2)).toEqual({ cell: { col: 0, row: 0 }, valid: true });
    });

    it('treats the block\'s own cell as free', () => {
        expect(dropTarget(placed, state, 'step-1', 3, -2)).toEqual({ cell: { col: 0, row: 1 }, valid: true });
    });
});

describe('dropTarget (nested)', () => {
    const step3 = placed.find((p) => p.block.id === 'step-3');
    const slotW = step3 ? (step3.w - 20) / 3 : 0;

    it('moves a child into a free sibling slot', () => {
        expect(dropTarget(placed, state, 'step-3-a', slotW * 2, 0)).toEqual({ cell: { col: 2, row: 0 }, valid: true });
    });

    it('rejects a slot taken by a sibling', () => {
        expect(dropTarget(placed, state, 'step-3-a', slotW, 0)).toEqual({ cell: { col: 1, row: 0 }, valid: false });
    });

    it('returns null when dragged outside the parent', () => {
        expect(dropTarget(placed, state, 'step-3-a', -slotW * 2, 0)).toBeNull();
    });
});
