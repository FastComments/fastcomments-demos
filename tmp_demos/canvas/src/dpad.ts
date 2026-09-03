import type { Targets } from './nav';
import type { Dir, StepSize } from './types';

export type Move = (dir: Dir, step: StepSize) => void;

function isDir(v: string | undefined): v is Dir {
    return v === 'left' || v === 'right' || v === 'up' || v === 'down';
}

function isStep(v: string | undefined): v is StepSize {
    return v === 'minor' || v === 'major';
}

export function initDpad(root: HTMLElement, move: Move): void {
    root.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const btn = target.closest('button[data-dir]');
        if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
        const dir = btn.dataset.dir;
        const step = btn.dataset.step;
        if (isDir(dir) && isStep(step)) move(dir, step);
    });
}

export function updateDpad(root: HTMLElement, targets: Targets): void {
    for (const btn of Array.from(root.querySelectorAll('button[data-dir]'))) {
        if (!(btn instanceof HTMLButtonElement)) continue;
        const dir = btn.dataset.dir;
        const step = btn.dataset.step;
        if (isDir(dir) && isStep(step)) {
            btn.disabled = targets[`${dir}-${step}`] === null;
        }
    }
}

function keyToDir(key: string): Dir | null {
    switch (key) {
        case 'ArrowLeft': return 'left';
        case 'ArrowRight': return 'right';
        case 'ArrowUp': return 'up';
        case 'ArrowDown': return 'down';
        default: return null;
    }
}

export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

export function dirFromKeyboard(e: KeyboardEvent): { dir: Dir; step: StepSize } | null {
    const dir = keyToDir(e.key);
    if (dir === null) return null;
    return { dir, step: e.shiftKey ? 'major' : 'minor' };
}
