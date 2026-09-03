import { describe, expect, it } from 'vitest';
import { layout } from '../layout';
import { nearest, nearestFrom, pickEdge, computeTargets } from '../nav';
import { seedState } from '../seed';

const state = seedState();
const placed = layout(state);

function idOf(p: { block: { id: string } } | null): string | null {
    return p ? p.block.id : null;
}

describe('nearest', () => {
    it('> from step 1 lands on step 2, ignoring the note above step 2', () => {
        expect(idOf(nearest(placed, 'step-1', 'right', false))).toBe('step-2');
    });

    it('>> from step 1 lands on step 2', () => {
        expect(idOf(nearest(placed, 'step-1', 'right', true))).toBe('step-2');
    });

    it('>> walks majors in sequence across the whole flow', () => {
        const order: string[] = [];
        let cur: string | null = 'step-1';
        while (cur) {
            const next = nearest(placed, cur, 'right', true);
            cur = idOf(next);
            if (cur) order.push(cur);
        }
        expect(order).toEqual(['step-2', 'step-3', 'step-4', 'step-5', 'step-6', 'step-6-review', 'step-7']);
    });

    it('> from step 3 visits its right-half children before step 4', () => {
        // step-3-c sits in the right column of step 3's inner grid.
        expect(idOf(nearest(placed, 'step-3', 'right', false))).toBe('step-3-c');
        expect(idOf(nearest(placed, 'step-3-c', 'right', false))).toBe('step-4');
    });

    it('> from step 2 lands on step 3 itself before any of its children', () => {
        expect(idOf(nearest(placed, 'step-2', 'right', false))).toBe('step-3');
    });

    it('> from a child of step 3 leaves to step 4, not to a child of step 5 in the same lane', () => {
        expect(idOf(nearest(placed, 'step-3-b', 'right', false))).toBe('step-4');
    });

    it('< from step 4 lands on step 3 itself, not its right-hand child', () => {
        expect(idOf(nearest(placed, 'step-4', 'left', false))).toBe('step-3');
    });

    it('nearestFrom a deleted spot right of step 3 slides to step 3, not a child', () => {
        const anchor = { cx: 11 * 176 + 80, cy: 176 + 80, w: 160, h: 160 };
        expect(idOf(nearestFrom(placed, anchor, null, 'left', false))).toBe('step-3');
    });

    it('< from step 1 has no target', () => {
        expect(nearest(placed, 'step-1', 'left', false)).toBeNull();
    });

    it('v from step 1 lands on the metric note below it', () => {
        expect(idOf(nearest(placed, 'step-1', 'down', false))).toBe('note-1-metric');
    });

    it('^ from step 1 lands on the owner note above it', () => {
        expect(idOf(nearest(placed, 'step-1', 'up', false))).toBe('note-1-owner');
    });

    it('pickEdge returns the top-left block for right/down and bottom-right for left/up', () => {
        expect(idOf(pickEdge(placed, 'right'))).toBe('note-1-owner');
        expect(idOf(pickEdge(placed, 'left'))).toBe('note-7-metric');
    });

    it('nearest without focus falls back to pickEdge', () => {
        expect(idOf(nearest(placed, null, 'right', true))).toBe('step-1');
    });

    it('computeTargets disables left/major-left at the start of the flow', () => {
        const t = computeTargets(placed, 'step-1');
        expect(t['left-minor']).toBeNull();
        expect(t['left-major']).toBeNull();
        expect(t['right-major']).toBe('step-2');
    });
});
