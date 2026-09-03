import { DIRS } from './types';
import type { Dir, Placed, StepSize } from './types';

const VECTORS: Record<Dir, { dx: number; dy: number }> = {
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
};

export type TargetKey = `${Dir}-${StepSize}`;

export type Targets = Record<TargetKey, string | null>;

function pool(placed: Placed[], majorOnly: boolean): Placed[] {
    return majorOnly ? placed.filter((p) => p.block.kind === 'major') : placed;
}

// With no focus, enter the canvas from the edge the user is moving away from.
export function pickEdge(placed: Placed[], dir: Dir): Placed | null {
    let best: Placed | null = null;
    for (const p of placed) {
        if (best === null || edgeCompare(p, best, dir) < 0) {
            best = p;
        }
    }
    return best;
}

function edgeCompare(a: Placed, b: Placed, dir: Dir): number {
    const horizontalFirst = dir === 'left' || dir === 'right';
    const primary = horizontalFirst ? a.cx - b.cx : a.cy - b.cy;
    const secondary = horizontalFirst ? a.cy - b.cy : a.cx - b.cx;
    const sign = dir === 'right' || dir === 'down' ? 1 : -1;
    if (primary !== 0) return primary * sign;
    return secondary * sign;
}

// Geometry to search from; a deleted block's old footprint works here too.
export interface Anchor {
    cx: number;
    cy: number;
    w: number;
    h: number;
}

export function nearest(placed: Placed[], fromId: string | null, dir: Dir, majorOnly: boolean): Placed | null {
    const from = fromId === null ? undefined : placed.find((p) => p.block.id === fromId);
    if (!from) {
        return pickEdge(pool(placed, majorOnly), dir);
    }
    return nearestFrom(placed, from, from.block.id, dir, majorOnly);
}

interface Ranked {
    lane: number;
    distance: number;
}

// Geometric test only: is p ahead of `from` in direction dir, and how does it rank?
function rank(from: Anchor, p: Placed, dir: Dir): Ranked | null {
    const { dx, dy } = VECTORS[dir];
    const horizontal = dir === 'left' || dir === 'right';
    const ex = p.cx - from.cx;
    const ey = p.cy - from.cy;
    const along = ex * dx + ey * dy;
    if (along <= 0.5) return null;
    const across = Math.abs(ex * dy - ey * dx);
    // Same lane when the perpendicular offset is inside either block's half extent, so a big step
    // next to a small child still counts as its neighbour.
    const band = Math.max(horizontal ? from.h / 2 : from.w / 2, horizontal ? p.h / 2 : p.w / 2);
    const lane = across <= band ? 0 : 1;
    // Off-lane blocks must be more "in direction" than sideways, or up/down and left/right overlap.
    if (lane === 1 && across > along) return null;
    return { lane, distance: lane === 0 ? along : along + across };
}

function ancestorIds(byId: Map<string, Placed>, id: string | null): Set<string> {
    const out = new Set<string>();
    let cur = id === null ? undefined : byId.get(id);
    while (cur) {
        out.add(cur.block.id);
        cur = cur.parentId === null ? undefined : byId.get(cur.parentId);
    }
    return out;
}

export function nearestFrom(placed: Placed[], from: Anchor, excludeId: string | null, dir: Dir, majorOnly: boolean): Placed | null {
    const candidates = new Set(pool(placed, majorOnly));
    const byId = new Map<string, Placed>();
    for (const p of placed) byId.set(p.block.id, p);
    // The focused block and its ancestors: children of these are reachable directly.
    const inside = ancestorIds(byId, excludeId);

    let best: Placed | null = null;
    let bestKey: [number, number, number] | null = null;
    for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        if (p.block.id === excludeId || !candidates.has(p)) continue;
        const r = rank(from, p, dir);
        if (r === null) continue;
        if (hasReachableAncestor(p, from, dir, byId, candidates, inside)) continue;
        const key: [number, number, number] = [r.lane, r.distance, i];
        if (bestKey === null || compareKeys(key, bestKey) < 0) {
            best = p;
            bestKey = key;
        }
    }
    return best;
}

// Parents come before their children in the sequence: a nested block is skipped when an ancestor
// that we are not already inside is itself a valid target in this direction.
function hasReachableAncestor(p: Placed, from: Anchor, dir: Dir, byId: Map<string, Placed>, candidates: Set<Placed>, inside: Set<string>): boolean {
    let parent = p.parentId === null ? undefined : byId.get(p.parentId);
    while (parent) {
        if (inside.has(parent.block.id)) return false;
        if (candidates.has(parent) && rank(from, parent, dir) !== null) return true;
        parent = parent.parentId === null ? undefined : byId.get(parent.parentId);
    }
    return false;
}

function compareKeys(a: [number, number, number], b: [number, number, number]): number {
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
}

export function computeTargets(placed: Placed[], fromId: string | null): Targets {
    const out: Targets = {
        'left-minor': null, 'left-major': null,
        'right-minor': null, 'right-major': null,
        'up-minor': null, 'up-major': null,
        'down-minor': null, 'down-major': null,
    };
    for (const dir of DIRS) {
        const minor = nearest(placed, fromId, dir, false);
        const major = nearest(placed, fromId, dir, true);
        out[`${dir}-minor`] = minor ? minor.block.id : null;
        out[`${dir}-major`] = major ? major.block.id : null;
    }
    return out;
}
