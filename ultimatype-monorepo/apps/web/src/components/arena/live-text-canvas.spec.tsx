import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveTextCanvas } from './live-text-canvas';

describe('LiveTextCanvas', () => {
  const text = 'Hola';
  const onPositionChange = vi.fn();

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
      <LiveTextCanvas text={text} onPositionChange={onPositionChange} />,
    );

    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'H' });

    expect(onPositionChange).toHaveBeenCalledWith(1);
  });

  it('colorea verde la letra correcta y roja la incorrecta', () => {
    const { container } = render(
      <LiveTextCanvas text={text} onPositionChange={vi.fn()} />,
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
      <LiveTextCanvas text={text} onPositionChange={handler} />,
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
      <LiveTextCanvas text="ab" onPositionChange={handler} />,
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
});
