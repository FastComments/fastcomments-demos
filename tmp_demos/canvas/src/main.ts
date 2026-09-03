import './styles.css';
import { dirFromKeyboard, initDpad, isTypingTarget, updateDpad } from './dpad';
import { layout, span } from './layout';
import { computeTargets, nearest, nearestFrom } from './nav';
import type { Anchor } from './nav';
import { nextChildSlot, nextTopLevelCell, occupied } from './place';
import { centerOn, firstLine, initCanvas, renderCanvas } from './render';
import type { CanvasHandlers, UiState } from './render';
import { seedState } from './seed';
import { depthOf, findBlock, findParent, newId, removeBlock, Store } from './state';
import { clear, load, save } from './storage';
import { isDark, wireThemeToggle } from './theme';
import { setThreadTheme, swapThread } from './thread';
import { initTree, renderTree } from './tree';
import { PALETTE } from './types';
import type { Block, BlockColor, BlockKind, Cell, Dir, Placed, StepSize } from './types';

function byId(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
}

function buttonById(id: string): HTMLButtonElement {
    const el = byId(id);
    if (!(el instanceof HTMLButtonElement)) throw new Error(`#${id} is not a button`);
    return el;
}

const app = byId('app');
const layer = byId('layer');
const viewport = byId('viewport');
const treeEl = byId('tree');
const dpadEl = byId('dpad');
const toolbarFocus = byId('toolbar-focus');
const focusLabel = byId('focus-label');
const swatchesEl = byId('swatches');
const threadMount = byId('thread-mount');
const threadTitle = byId('thread-title');
const threadKind = byId('thread-kind');
const popover = byId('popover');
const themeToggle = byId('theme-toggle');
const addMinorBtn = buttonById('add-minor');
const addMajorBtn = buttonById('add-major');
const addChildMinorBtn = buttonById('add-child-minor');
const addChildMajorBtn = buttonById('add-child-major');
const deleteBtn = buttonById('delete');
const resetBtn = buttonById('reset');
const threadToggleBtn = buttonById('thread-toggle');
const popoverMinorBtn = buttonById('popover-minor');
const popoverMajorBtn = buttonById('popover-major');

const store = new Store(load());
const ui: UiState = { editingId: null };
let popoverCell: Cell | null = null;

function focusedBlock(): Block | undefined {
    const id = store.get().focusedId;
    return id === null ? undefined : findBlock(store.get().blocks, id);
}

function setFocus(id: string | null): void {
    if (ui.editingId !== null && ui.editingId !== id) {
        ui.editingId = null;
    }
    store.set((d) => { d.focusedId = id; });
}

function move(dir: Dir, step: StepSize): void {
    const state = store.get();
    const target = nearest(layout(state), state.focusedId, dir, step === 'major');
    if (target) setFocus(target.block.id);
}

function makeBlock(kind: BlockKind, cell: Cell): Block {
    return { id: newId(), kind, color: kind === 'major' ? 'blue' : 'slate', text: '', col: cell.col, row: cell.row, children: [] };
}

function addTopLevel(kind: BlockKind, cell?: Cell): void {
    const state = store.get();
    const placed = layout(state);
    const at = cell ?? nextTopLevelCell(state, kind, placed);
    if (occupied(state.blocks, at.col, at.row, span(kind))) return;
    const block = makeBlock(kind, at);
    ui.editingId = block.id;
    store.set((d) => {
        d.blocks.push(block);
        d.focusedId = block.id;
    });
}

function addChild(kind: BlockKind): void {
    const parent = focusedBlock();
    if (!parent) return;
    const slot = nextChildSlot(parent);
    if (!slot) return;
    const block = makeBlock(kind, slot);
    ui.editingId = block.id;
    store.set((d) => {
        parent.children.push(block);
        d.focusedId = block.id;
    });
}

function deleteFocused(): void {
    const state = store.get();
    const id = state.focusedId;
    if (id === null) return;
    const placed = layout(state);
    const parent = findParent(state.blocks, id);
    const parentId = parent ? parent.id : null;
    const from = placed.find((p) => p.block.id === id);
    ui.editingId = null;
    store.set((d) => {
        removeBlock(d.blocks, id);
        d.focusedId = nextFocusAfterDelete(layout(d), from, parentId);
    });
}

// Focus slides to a neighbour in the sequence, then the parent, then whatever is left.
function nextFocusAfterDelete(placed: Placed[], from: Anchor | undefined, parentId: string | null): string | null {
    if (from) {
        const left = nearestFrom(placed, from, null, 'left', false);
        if (left) return left.block.id;
        const right = nearestFrom(placed, from, null, 'right', false);
        if (right) return right.block.id;
    }
    if (parentId !== null) return parentId;
    return placed.length > 0 ? placed[0].block.id : null;
}

function setColor(color: BlockColor): void {
    const block = focusedBlock();
    if (!block) return;
    store.set(() => { block.color = color; });
}

function commitEdit(id: string, text: string): void {
    if (ui.editingId !== id) return;
    ui.editingId = null;
    const block = findBlock(store.get().blocks, id);
    if (!block) return;
    store.set(() => { block.text = text.replace(/\u00a0/g, ' ').trimEnd(); });
}

function startEdit(id: string): void {
    ui.editingId = id;
    store.set((d) => { d.focusedId = id; });
}

function hidePopover(): void {
    popover.hidden = true;
    popoverCell = null;
}

function showPopover(cell: Cell, clientX: number, clientY: number): void {
    const state = store.get();
    if (occupied(state.blocks, cell.col, cell.row, 1)) return;
    popoverCell = cell;
    popoverMajorBtn.disabled = occupied(state.blocks, cell.col, cell.row, 3);
    popoverMajorBtn.textContent = popoverMajorBtn.disabled ? 'No room for a major block here' : 'Add major block here';
    popover.hidden = false;
    const maxX = window.innerWidth - popover.offsetWidth - 8;
    const maxY = window.innerHeight - popover.offsetHeight - 8;
    popover.style.left = `${Math.min(clientX, maxX)}px`;
    popover.style.top = `${Math.min(clientY, maxY)}px`;
}

const handlers: CanvasHandlers = {
    onFocus: (id) => setFocus(id),
    onStartEdit: (id) => startEdit(id),
    onCommitEdit: (id, text) => commitEdit(id, text),
    onCancelEdit: () => {
        ui.editingId = null;
        store.set(() => undefined);
    },
    onEmptyCellClick: (cell, x, y) => showPopover(cell, x, y),
    onMove: (id, cell) => moveBlock(id, cell),
};

function moveBlock(id: string, cell: Cell): void {
    const block = findBlock(store.get().blocks, id);
    if (!block) return;
    store.set((d) => {
        block.col = cell.col;
        block.row = cell.row;
        d.focusedId = id;
    });
}

function renderSwatches(block: Block): void {
    const frag = document.createDocumentFragment();
    for (const color of PALETTE) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swatch';
        b.title = color;
        b.dataset.color = color;
        b.style.setProperty('--swatch-bg', `var(--c-${color}-bg)`);
        b.style.setProperty('--swatch-border', `var(--c-${color}-border)`);
        b.setAttribute('aria-pressed', block.color === color ? 'true' : 'false');
        frag.appendChild(b);
    }
    swatchesEl.replaceChildren(frag);
}

function renderToolbar(): void {
    const block = focusedBlock();
    toolbarFocus.hidden = !block;
    if (!block) return;
    const depth = depthOf(store.get().blocks, block.id);
    focusLabel.textContent = `${firstLine(block.text)} (${block.kind})`;
    renderSwatches(block);
    const canNest = depth < 2 && nextChildSlot(block) !== null;
    addChildMinorBtn.hidden = depth >= 2;
    addChildMajorBtn.hidden = depth >= 2;
    addChildMinorBtn.disabled = !canNest;
    addChildMajorBtn.disabled = !canNest;
}

function renderThread(): void {
    const block = focusedBlock();
    threadTitle.textContent = block ? firstLine(block.text) : 'Comments';
    threadKind.textContent = block ? (block.kind === 'major' ? 'Major block' : 'Minor block') : '';
    swapThread(threadMount, block ? block.id : null, isDark());
}

function renderAll(animate: boolean): void {
    const state = store.get();
    save(state);
    const placed = layout(state);
    renderCanvas(layer, placed, state, ui, handlers);
    renderTree(treeEl, state);
    updateDpad(dpadEl, computeTargets(placed, state.focusedId));
    renderToolbar();
    centerOn(viewport, layer, placed, state.focusedId, animate);
    renderThread();
}

initCanvas(layer, handlers);
initTree(treeEl, (id) => setFocus(id));
initDpad(dpadEl, move);
wireThemeToggle(themeToggle, (t) => setThreadTheme(t === 'dark'));

addMinorBtn.addEventListener('click', () => addTopLevel('minor'));
addMajorBtn.addEventListener('click', () => addTopLevel('major'));
addChildMinorBtn.addEventListener('click', () => addChild('minor'));
addChildMajorBtn.addEventListener('click', () => addChild('major'));
deleteBtn.addEventListener('click', () => deleteFocused());
resetBtn.addEventListener('click', () => {
    clear();
    ui.editingId = null;
    store.replace(seedState());
});
threadToggleBtn.addEventListener('click', () => app.classList.toggle('show-thread'));
swatchesEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const color = PALETTE.find((c) => c === target.dataset.color);
    if (color) setColor(color);
});
popoverMinorBtn.addEventListener('click', () => {
    if (popoverCell) addTopLevel('minor', popoverCell);
    hidePopover();
});
popoverMajorBtn.addEventListener('click', () => {
    if (popoverCell) addTopLevel('major', popoverCell);
    hidePopover();
});
document.addEventListener('pointerdown', (e) => {
    if (!popover.hidden && e.target instanceof Node && !popover.contains(e.target)) hidePopover();
});

window.addEventListener('keydown', (e) => {
    if (ui.editingId !== null || isTypingTarget(e.target)) return;
    if (e.key === 'Escape') {
        hidePopover();
        return;
    }
    const nav = dirFromKeyboard(e);
    if (nav) {
        e.preventDefault();
        move(nav.dir, nav.step);
        return;
    }
    const state = store.get();
    if (e.key === 'Enter' && state.focusedId !== null) {
        e.preventDefault();
        startEdit(state.focusedId);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.focusedId !== null) {
        e.preventDefault();
        deleteFocused();
    }
});

window.addEventListener('resize', () => {
    const state = store.get();
    centerOn(viewport, layer, layout(state), state.focusedId, false);
});

// Start on the first block so the d-pad has somewhere to go.
if (store.get().focusedId === null && store.get().blocks.length > 0) {
    store.replace({ ...store.get(), focusedId: store.get().blocks[0].id });
}
renderAll(false);
store.subscribe(() => renderAll(true));
