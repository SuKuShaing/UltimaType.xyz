import { render, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './use-theme';

function TestConsumer() {
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="cycle" onClick={cycleTheme}>cycle</button>
    </div>
  );
}

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>,
  );
}

let matchMediaListeners: Array<() => void> = [];
let prefersDark = false;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  matchMediaListeners = [];
  prefersDark = false;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
      addEventListener: (_event: string, handler: () => void) => {
        matchMediaListeners.push(handler);
      },
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ThemeProvider (AC5)', () => {
  it('defaults to system when no localStorage value', () => {
    const { getByTestId } = renderWithTheme();
    expect(getByTestId('theme').textContent).toBe('system');
  });

  it('resolves to light when system prefers light', () => {
    prefersDark = false;
    const { getByTestId } = renderWithTheme();
    expect(getByTestId('resolved').textContent).toBe('light');
  });

  it('resolves to dark when system prefers dark', () => {
    prefersDark = true;
    const { getByTestId } = renderWithTheme();
    expect(getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists user choice to localStorage', () => {
    const { getByTestId } = renderWithTheme();
    act(() => {
      getByTestId('cycle').click(); // system → light
    });
    expect(localStorage.getItem('theme')).toBe('light');
    expect(getByTestId('theme').textContent).toBe('light');
  });

  it('cycles through light → dark → system', () => {
    const { getByTestId } = renderWithTheme();
    // system → light
    act(() => getByTestId('cycle').click());
    expect(getByTestId('theme').textContent).toBe('light');
    // light → dark
    act(() => getByTestId('cycle').click());
    expect(getByTestId('theme').textContent).toBe('dark');
    // dark → system
    act(() => getByTestId('cycle').click());
    expect(getByTestId('theme').textContent).toBe('system');
  });

  it('applies .dark class when theme is dark', () => {
    const { getByTestId } = renderWithTheme();
    act(() => getByTestId('cycle').click()); // system → light
    act(() => getByTestId('cycle').click()); // light → dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes .dark class when theme is light', () => {
    document.documentElement.classList.add('dark');
    const { getByTestId } = renderWithTheme();
    act(() => getByTestId('cycle').click()); // system → light
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('restores theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');
    const { getByTestId } = renderWithTheme();
    expect(getByTestId('theme').textContent).toBe('dark');
    expect(getByTestId('resolved').textContent).toBe('dark');
  });

  it('reacts to OS preference change while in system mode', () => {
    prefersDark = false;
    const { getByTestId } = renderWithTheme();
    expect(getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Simulate OS switching to dark
    prefersDark = true;
    act(() => { matchMediaListeners.forEach(h => h()); });

    expect(getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
