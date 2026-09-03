import { dropTarget, targetRect } from './drag';
import type { DropTarget } from './drag';
import { bounds, GAP, PITCH } from './layout';
import { cellFromPoint } from './place';
import type { CanvasState, Cell, Placed } from './types';

export interface UiState {
    editingId: string | null;
}

export interface CanvasHandlers {
    onFocus: (id: string) => void;
    onStartEdit: (id: string) => void;
    onCommitEdit: (id: string, text: string) => void;
    onCancelEdit: () => void;
    onEmptyCellClick: (cell: Cell, clientX: number, clientY: number) => void;
    onMove: (id: string, cell: Cell) => void;
}

// Pointer movement below this (px) is a click, not a drag.
const DRAG_THRESHOLD = 5;

interface DraggedNode {
    el: HTMLElement;
    x: number;
    y: number;
}

interface DragSession {
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    placed: Placed;
    el: HTMLElement;
    // Descendants ride along so a parent does not leave its children behind mid-drag.
    children: DraggedNode[];
    active: boolean;
    target: DropTarget | null;
}

function descendantNodes(layer: HTMLElement, placed: Placed[], id: string): DraggedNode[] {
    const inside = new Set<string>([id]);
    const out: DraggedNode[] = [];
    // Placed is depth-first, so a parent is always seen before its children.
    for (const p of placed) {
        if (p.parentId !== null && inside.has(p.parentId)) {
            inside.add(p.block.id);
            const el = layer.querySelector(`.block[data-id="${cssEscape(p.block.id)}"]`);
            if (el instanceof HTMLElement) out.push({ el, x: p.x, y: p.y });
        }
    }
    return out;
}

function positionDragged(session: DragSession, dx: number, dy: number): void {
    session.el.style.left = `${session.placed.x + dx}px`;
    session.el.style.top = `${session.placed.y + dy}px`;
    for (const c of session.children) {
        c.el.style.left = `${c.x + dx}px`;
        c.el.style.top = `${c.y + dy}px`;
    }
}

// The renderer keeps the last render inputs so the drag handlers can snap against them.
let latestPlaced: Placed[] = [];
let latestState: CanvasState | null = null;
let drag: DragSession | null = null;

export function firstLine(text: string): string {
    const line = text.split('\n').find((l) => l.trim().length > 0);
    return line ? line.trim() : 'Untitled';
}

function blockIdFromEvent(e: Event): string | null {
    const target = e.target;
    if (!(target instanceof Element)) return null;
    const el = target.closest('.block');
    if (!(el instanceof HTMLElement) || !el.dataset.id) return null;
    return el.dataset.id;
}

export function initCanvas(layer: HTMLElement, handlers: CanvasHandlers): void {
    layer.style.setProperty('--pitch', `${PITCH}px`);
    layer.style.setProperty('--major-pitch', `${PITCH * 3}px`);
    layer.style.setProperty('--grid-offset', `${-GAP / 2}px`);

    layer.addEventListener('click', (e) => {
        const id = blockIdFromEvent(e);
        if (id !== null) {
            handlers.onFocus(id);
            return;
        }
        if (e.target === layer) {
            const rect = layer.getBoundingClientRect();
            handlers.onEmptyCellClick(cellFromPoint(e.clientX - rect.left, e.clientY - rect.top), e.clientX, e.clientY);
        }
    });

    layer.addEventListener('dblclick', (e) => {
        const id = blockIdFromEvent(e);
        if (id !== null) handlers.onStartEdit(id);
    });

    const ghost = document.createElement('div');
    ghost.className = 'drop-ghost';
    ghost.hidden = true;

    const endDrag = (commit: boolean): void => {
        if (!drag) return;
        const session = drag;
        drag = null;
        ghost.hidden = true;
        session.el.classList.remove('is-dragging');
        for (const c of session.children) c.el.classList.remove('is-dragging-child');
        if (session.active && commit && session.target && session.target.valid) {
            handlers.onMove(session.id, session.target.cell);
        } else if (session.active) {
            // Snap back to where the block was.
            positionDragged(session, 0, 0);
        }
    };

    layer.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !latestState) return;
        const id = blockIdFromEvent(e);
        if (id === null) return;
        const target = e.target;
        // Typing inside a block must not start a drag.
        if (target instanceof HTMLElement && target.isContentEditable) return;
        const p = latestPlaced.find((x) => x.block.id === id);
        const el = target instanceof Element ? target.closest('.block') : null;
        if (!p || !(el instanceof HTMLElement)) return;
        drag = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, placed: p, el, children: descendantNodes(layer, latestPlaced, id), active: false, target: null };
        el.setPointerCapture(e.pointerId);
    });

    layer.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.pointerId || !latestState) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.active) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            drag.active = true;
            drag.el.classList.add('is-dragging');
            for (const c of drag.children) c.el.classList.add('is-dragging-child');
            layer.appendChild(ghost);
        }
        positionDragged(drag, dx, dy);
        drag.target = dropTarget(latestPlaced, latestState, drag.id, dx, dy);
        if (drag.target) {
            const rect = targetRect(latestPlaced, drag.placed, drag.target);
            ghost.hidden = false;
            ghost.className = `drop-ghost ${drag.target.valid ? 'is-valid' : 'is-invalid'}`;
            ghost.style.left = `${rect.x}px`;
            ghost.style.top = `${rect.y}px`;
            ghost.style.width = `${rect.w}px`;
            ghost.style.height = `${rect.h}px`;
        } else {
            ghost.hidden = true;
        }
    });

    layer.addEventListener('pointerup', (e) => {
        if (drag && e.pointerId === drag.pointerId) endDrag(true);
    });
    layer.addEventListener('pointercancel', () => endDrag(false));
}

export function renderCanvas(layer: HTMLElement, placed: Placed[], state: CanvasState, ui: UiState, handlers: CanvasHandlers): void {
    latestPlaced = placed;
    latestState = state;
    // A re-render mid-drag (e.g. from the thread panel) would orphan the dragged element.
    drag = null;
    const size = bounds(placed);
    layer.style.width = `${size.width}px`;
    layer.style.height = `${size.height}px`;

    // The block being edited keeps its live DOM node so the caret survives the re-render.
    const editing = ui.editingId === null ? null : layer.querySelector(`.block[data-id="${cssEscape(ui.editingId)}"]`);
    const fragment = document.createDocumentFragment();
    let focusEditor: HTMLElement | null = null;

    for (const p of placed) {
        let el: HTMLElement;
        if (editing instanceof HTMLElement && p.block.id === ui.editingId) {
            el = editing;
        } else {
            el = buildBlock(p, ui, handlers);
            if (p.block.id === ui.editingId) {
                const text = el.querySelector('.block-text');
                if (text instanceof HTMLElement) focusEditor = text;
            }
        }
        el.className = classNames(p, state, ui);
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
        el.style.width = `${p.w}px`;
        el.style.height = `${p.h}px`;
        el.style.zIndex = `${p.depth + 1}`;
        fragment.appendChild(el);
    }

    layer.replaceChildren(fragment);

    if (focusEditor) {
        placeCaretAtEnd(focusEditor);
    }
}

function classNames(p: Placed, state: CanvasState, ui: UiState): string {
    const names = ['block', `kind-${p.block.kind}`, `color-${p.block.color}`, `depth-${p.depth}`];
    if (p.block.children.length > 0) names.push('has-children');
    if (p.block.id === state.focusedId) names.push('is-focused');
    if (p.block.id === ui.editingId) names.push('is-editing');
    return names.join(' ');
}

function buildBlock(p: Placed, ui: UiState, handlers: CanvasHandlers): HTMLElement {
    const el = document.createElement('div');
    el.dataset.id = p.block.id;
    el.title = p.block.kind === 'major' ? 'Major block' : 'Minor block';

    const text = document.createElement('div');
    text.className = 'block-text';
    if (p.block.id === ui.editingId) {
        text.textContent = p.block.text;
        text.contentEditable = 'true';
        text.spellcheck = false;
        const original = p.block.text;
        text.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handlers.onCommitEdit(p.block.id, text.innerText);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                text.textContent = original;
                handlers.onCancelEdit();
            } else {
                // Arrow keys and Delete belong to the editor while typing, not the d-pad.
                e.stopPropagation();
            }
        });
        text.addEventListener('blur', () => {
            handlers.onCommitEdit(p.block.id, text.innerText);
        });
    } else {
        // Display mode splits the first line out as the title; the editor works on the raw text.
        const lines = p.block.text.split('\n');
        const titleIdx = lines.findIndex((l) => l.trim().length > 0);
        const title = document.createElement('span');
        title.className = 'block-title';
        title.textContent = titleIdx >= 0 ? lines[titleIdx].trim() : '';
        text.appendChild(title);
        const rest = titleIdx >= 0 ? lines.slice(titleIdx + 1).join('\n').trim() : '';
        if (rest.length > 0) {
            const body = document.createElement('span');
            body.className = 'block-body';
            body.textContent = rest;
            text.appendChild(body);
        }
    }
    el.appendChild(text);
    return el;
}

function placeCaretAtEnd(el: HTMLElement): void {
    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

function cssEscape(id: string): string {
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
}

let resizeArmed = false;

export function centerOn(viewport: HTMLElement, layer: HTMLElement, placed: Placed[], focusedId: string | null, animate: boolean): void {
    const target = focusedId === null ? undefined : placed.find((p) => p.block.id === focusedId);
    const cx = target ? target.cx : PITCH * 2;
    const cy = target ? target.cy : PITCH * 2;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    layer.classList.toggle('no-anim', !animate);
    layer.style.transform = `translate(${Math.round(vw / 2 - cx)}px, ${Math.round(vh / 2 - cy)}px)`;
    if (!animate && !resizeArmed) {
        resizeArmed = true;
        // Re-enable the transition on the next frame so only this reposition is instant.
        window.requestAnimationFrame(() => {
            layer.classList.remove('no-anim');
            resizeArmed = false;
        });
    }
}
