export type Theme = 'light' | 'dark';

const KEY = 'fc-showcase-theme';

export function currentTheme(): Theme {
    return document.documentElement.getAttribute('data-fc-theme') === 'dark' ? 'dark' : 'light';
}

export function isDark(): boolean {
    return currentTheme() === 'dark';
}

export function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-fc-theme', theme);
    try {
        window.localStorage.setItem(KEY, theme);
    } catch {
        // Persistence is optional.
    }
}

export function wireThemeToggle(root: HTMLElement, onChange: (theme: Theme) => void): void {
    const buttons = Array.from(root.querySelectorAll('button[data-theme]'));
    const sync = (): void => {
        const t = currentTheme();
        for (const b of buttons) {
            if (b instanceof HTMLButtonElement) {
                b.setAttribute('aria-pressed', b.dataset.theme === t ? 'true' : 'false');
            }
        }
    };
    for (const b of buttons) {
        if (!(b instanceof HTMLButtonElement)) continue;
        b.addEventListener('click', () => {
            const t: Theme = b.dataset.theme === 'dark' ? 'dark' : 'light';
            applyTheme(t);
            sync();
            onChange(t);
        });
    }
    sync();
}
