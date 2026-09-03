import { firstLine } from './render';
import type { Block, CanvasState } from './types';

export function initTree(root: HTMLElement, onFocus: (id: string) => void): void {
    root.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const node = target.closest('.tree-node');
        if (node instanceof HTMLElement && node.dataset.id) {
            onFocus(node.dataset.id);
        }
    });
}

export function renderTree(root: HTMLElement, state: CanvasState): void {
    if (state.blocks.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'tree-empty';
        empty.textContent = 'The canvas is empty. Add a block to get started.';
        root.replaceChildren(empty);
        return;
    }
    root.replaceChildren(buildList(state.blocks, state.focusedId));
    const current = root.querySelector('[aria-current="true"]');
    if (current instanceof HTMLElement) {
        current.scrollIntoView({ block: 'nearest' });
    }
}

function buildList(blocks: Block[], focusedId: string | null): HTMLUListElement {
    const ul = document.createElement('ul');
    for (const b of blocks) {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tree-node tree-node-${b.kind}`;
        btn.dataset.id = b.id;
        btn.setAttribute('aria-current', b.id === focusedId ? 'true' : 'false');
        btn.title = b.kind === 'major' ? 'Major block' : 'Minor block';

        const swatch = document.createElement('span');
        swatch.className = 'tree-swatch';
        swatch.style.setProperty('--swatch-bg', `var(--c-${b.color}-bg)`);
        swatch.style.setProperty('--swatch-border', `var(--c-${b.color}-border)`);

        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = firstLine(b.text);

        btn.append(swatch, label);
        li.appendChild(btn);
        if (b.children.length > 0) {
            li.appendChild(buildList(b.children, focusedId));
        }
        ul.appendChild(li);
    }
    return ul;
}
