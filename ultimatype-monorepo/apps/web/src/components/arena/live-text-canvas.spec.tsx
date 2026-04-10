import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveTextCanvas } from './live-text-canvas';
import { arenaStore } from '../../hooks/use-arena-store';

describe('LiveTextCanvas', () => {
  const text = 'Hola';
  const onPositionChange = vi.fn();

  beforeEach(() => {
    arenaStore.getState().reset();
  });

  it('renderiza cada caracter como un span individual', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={onPositionChange} />,
    );

    const spans = container.querySelectorAll('span[data-index]');
    expect(spans).toHaveLength(4);
    expect(spans[0].textContent).toBe('H');
    expect(spans[1].textContent).toBe('o');
    expect(spans[2].textContent).toBe('l');
    expect(spans[3].textContent).toBe('a');
  });

  it('tiene un gemelo sr-only con el texto completo para accesibilidad', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={onPositionChange} />,
    );

    const srOnly = container.querySelector('.sr-only');
    expect(srOnly).toBeTruthy();
    expect(srOnly!.textContent).toBe(text);
  });

  it('llama onPositionChange al teclear correctamente', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={onPositionChange} isActive />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'H' });

    expect(onPositionChange).toHaveBeenCalledWith(1);
  });

  it('colorea verde la letra correcta y roja la incorrecta', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const input = container.querySelector('input')!;
    const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

    // Correct keystroke — jsdom converts hex to rgb
    fireEvent.keyDown(input, { key: 'H' });
    expect(spans[0].style.color).toBe('rgb(74, 222, 128)');

    // Incorrect keystroke
    fireEvent.keyDown(input, { key: 'x' });
    expect(spans[1].style.color).toBe('rgb(251, 113, 133)');
  });

  it('retrocede con Backspace y resetea el color', () => {
    const handler = vi.fn();
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={handler} isActive />,
    );

    const input = container.querySelector('input')!;
    const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

    // Type one char, then backspace
    fireEvent.keyDown(input, { key: 'H' });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(handler).toHaveBeenLastCalledWith(0);
    expect(spans[0].style.opacity).toBe('0.6');
  });

  it('no avanza mas alla del largo del texto', () => {
    const handler = vi.fn();
    const { container } = render(
      <LiveTextCanvas text="ab" onPositionChange={handler} isActive />,
    );

    const input = container.querySelector('input')!;

    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'b' });
    fireEvent.keyDown(input, { key: 'c' }); // should be ignored

    // Last call should be position 2 (end of text)
    const calls = handler.mock.calls;
    expect(calls[calls.length - 1][0]).toBe(2);
    expect(calls).toHaveLength(2); // Only 2 calls, 3rd ignored
  });

  it('ignora eventos de teclado cuando isActive es false', () => {
    const handler = vi.fn();
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={handler} isActive={false} />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'H' });
    fireEvent.keyDown(input, { key: 'o' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('aplica blur al contenedor de texto cuando isActive es false', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive={false} />,
    );

    const textDiv = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(textDiv?.style.filter).toBe('blur(8px)');
  });

  it('no aplica blur al contenedor de texto cuando isActive es true', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const textDiv = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(textDiv?.style.filter).toBe('');
  });

  it('incrementa keystrokes en el store al tipear correctamente', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'H' }); // correct

    const state = arenaStore.getState();
    expect(state.totalKeystrokes).toBe(1);
    expect(state.errorKeystrokes).toBe(0);
  });

  it('incrementa errorKeystrokes en el store al tipear incorrectamente', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'X' }); // incorrect (expected 'H')

    const state = arenaStore.getState();
    expect(state.totalKeystrokes).toBe(1);
    expect(state.errorKeystrokes).toBe(1);
  });

  it('NO incrementa keystrokes en el store al presionar Backspace', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'H' }); // correct — count: 1
    fireEvent.keyDown(input, { key: 'Backspace' }); // should NOT count

    const state = arenaStore.getState();
    expect(state.totalKeystrokes).toBe(1);
  });

  it('Backspace sobre error decrementa errorKeystrokes', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'X' }); // error at pos 0
    expect(arenaStore.getState().errorKeystrokes).toBe(1);

    fireEvent.keyDown(input, { key: 'Backspace' }); // correct the error
    expect(arenaStore.getState().errorKeystrokes).toBe(0);
  });

  it('Backspace sobre caracter correcto NO decrementa errorKeystrokes', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} isActive />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'H' }); // correct at pos 0
    fireEvent.keyDown(input, { key: 'X' }); // error at pos 1
    expect(arenaStore.getState().errorKeystrokes).toBe(1);

    fireEvent.keyDown(input, { key: 'Backspace' }); // back from pos 2 to pos 1 (error) → decrement
    expect(arenaStore.getState().errorKeystrokes).toBe(0);

    fireEvent.keyDown(input, { key: 'e' }); // correct pos 1
    fireEvent.keyDown(input, { key: 'Backspace' }); // back to pos 1 (was correct) → NO decrement
    expect(arenaStore.getState().errorKeystrokes).toBe(0);
  });

  describe('Acentos y composición IME (macOS / Linux)', () => {
    it('detecta acentos correctos via keydown directo (NFC)', () => {
      const { container } = render(
        <LiveTextCanvas text="mamá" onPositionChange={vi.fn()} isActive />,
      );
      const input = container.querySelector('input')!;
      const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: '\u00E1' }); // á NFC

      expect(spans[3].style.color).toBe('rgb(74, 222, 128)');
      expect(arenaStore.getState().errorKeystrokes).toBe(0);
    });

    it('detecta acentos correctos via compositionEnd (dead keys macOS)', () => {
      const { container } = render(
        <LiveTextCanvas text="mamá" onPositionChange={vi.fn()} isActive />,
      );
      const input = container.querySelector('input')!;
      const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'm' });

      // Simulate macOS dead key: compositionStart → compositionEnd with composed char
      fireEvent.compositionStart(input);
      fireEvent.compositionEnd(input, { data: '\u00E1' }); // á

      expect(spans[3].style.color).toBe('rgb(74, 222, 128)');
      expect(arenaStore.getState().errorKeystrokes).toBe(0);
    });

    it('compositionEnd con carácter NFD se normaliza y matchea NFC', () => {
      const { container } = render(
        <LiveTextCanvas text="país" onPositionChange={vi.fn()} isActive />,
      );
      const input = container.querySelector('input')!;
      const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

      fireEvent.keyDown(input, { key: 'p' });
      fireEvent.keyDown(input, { key: 'a' });

      // í in NFD form (i + combining acute)
      fireEvent.compositionStart(input);
      fireEvent.compositionEnd(input, { data: 'i\u0301' });

      fireEvent.keyDown(input, { key: 's' });

      expect(spans[2].style.color).toBe('rgb(74, 222, 128)'); // í green
      expect(spans[3].style.color).toBe('rgb(74, 222, 128)'); // s green
      expect(arenaStore.getState().errorKeystrokes).toBe(0);
      expect(arenaStore.getState().totalKeystrokes).toBe(4);
    });

    it('ignora keydown durante composición IME activa', () => {
      const handler = vi.fn();
      const { container } = render(
        <LiveTextCanvas text="mamá" onPositionChange={handler} isActive />,
      );
      const input = container.querySelector('input')!;

      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'm' });

      // During composition, keydown with isComposing should be ignored
      fireEvent.compositionStart(input);
      fireEvent.keyDown(input, { key: 'a', nativeEvent: { isComposing: true } });

      // Only 3 position changes before composition
      expect(handler).toHaveBeenCalledTimes(3);

      // The composed character arrives via compositionEnd
      fireEvent.compositionEnd(input, { data: 'á' });
      expect(handler).toHaveBeenCalledTimes(4);
    });

    it('acento incorrecto via compositionEnd se marca rojo', () => {
      const { container } = render(
        <LiveTextCanvas text="mamá" onPositionChange={vi.fn()} isActive />,
      );
      const input = container.querySelector('input')!;
      const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'm' });

      // Wrong accent: è instead of á
      fireEvent.compositionStart(input);
      fireEvent.compositionEnd(input, { data: 'è' });

      expect(spans[3].style.color).toBe('rgb(251, 113, 133)'); // red
      expect(arenaStore.getState().errorKeystrokes).toBe(1);
    });

    it('texto fuente en NFD se normaliza para comparación y renderizado', () => {
      // "mamá" in NFD: the á is decomposed into a + combining acute
      const nfdText = 'mam\u0061\u0301';
      const { container } = render(
        <LiveTextCanvas text={nfdText} onPositionChange={vi.fn()} isActive />,
      );
      const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;
      const input = container.querySelector('input')!;

      // NFC normalization should produce 4 spans, not 5
      expect(spans).toHaveLength(4);

      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'm' });
      fireEvent.keyDown(input, { key: '\u00E1' }); // á NFC

      expect(spans[3].style.color).toBe('rgb(74, 222, 128)');
    });

    it('palabra completa con múltiples acentos: México', () => {
      const { container } = render(
        <LiveTextCanvas text="México" onPositionChange={vi.fn()} isActive />,
      );
      const input = container.querySelector('input')!;
      const spans = container.querySelectorAll('span[data-index]') as NodeListOf<HTMLSpanElement>;

      fireEvent.keyDown(input, { key: 'M' });

      // é via compositionEnd
      fireEvent.compositionStart(input);
      fireEvent.compositionEnd(input, { data: 'é' });

      fireEvent.keyDown(input, { key: 'x' });
      fireEvent.keyDown(input, { key: 'i' });
      fireEvent.keyDown(input, { key: 'c' });
      fireEvent.keyDown(input, { key: 'o' });

      for (let i = 0; i < 6; i++) {
        expect(spans[i].style.color).toBe('rgb(74, 222, 128)');
      }
      expect(arenaStore.getState().errorKeystrokes).toBe(0);
      expect(arenaStore.getState().totalKeystrokes).toBe(6);
    });
  });
});

describe('LiveTextCanvas — Design System tokens (AC1)', () => {
  const onPositionChange = vi.fn();

  it('contenedor externo usa bg-surface-container-lowest', () => {
    const { container } = render(
      <LiveTextCanvas text="Hola" onPositionChange={onPositionChange} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.classList.contains('bg-surface-container-lowest')).toBe(true);
  });

  it('contenedor externo usa rounded-card-lg', () => {
    const { container } = render(
      <LiveTextCanvas text="Hola" onPositionChange={onPositionChange} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.classList.contains('rounded-card-lg')).toBe(true);
  });

  it('contenedor externo tiene padding p-10', () => {
    const { container } = render(
      <LiveTextCanvas text="Hola" onPositionChange={onPositionChange} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.classList.contains('p-10')).toBe(true);
  });

  it('área de texto usa font-mono (IBM Plex Mono)', () => {
    const { container } = render(
      <LiveTextCanvas text="Hola" onPositionChange={onPositionChange} />,
    );
    const textArea = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(textArea.classList.contains('font-mono')).toBe(true);
  });
});
