import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReconnectingOverlay } from './reconnecting-overlay';

describe('ReconnectingOverlay', () => {
  it('muestra Reconectando y numero de intento cuando status es reconnecting y attempt > 0', () => {
    render(
      <ReconnectingOverlay
        status="reconnecting"
        attempt={2}
        maxAttempts={5}
        onGoHome={vi.fn()}
      />,
    );

    expect(screen.getByText('Reconectando...')).toBeTruthy();
    expect(screen.getByText('Intento 2 de 5')).toBeTruthy();
  });

  it('no muestra contador de intento cuando attempt es 0', () => {
    render(
      <ReconnectingOverlay
        status="reconnecting"
        attempt={0}
        maxAttempts={5}
        onGoHome={vi.fn()}
      />,
    );

    expect(screen.getByText('Reconectando...')).toBeTruthy();
    expect(screen.queryByText(/Intento/)).toBeNull();
  });

  it('no muestra boton cuando status es reconnecting', () => {
    render(
      <ReconnectingOverlay
        status="reconnecting"
        attempt={1}
        maxAttempts={5}
        onGoHome={vi.fn()}
      />,
    );

    expect(screen.queryByText('Volver al inicio')).toBeNull();
  });

  it('muestra Conexion perdida y boton cuando status es disconnected', () => {
    render(
      <ReconnectingOverlay
        status="disconnected"
        attempt={5}
        maxAttempts={5}
        onGoHome={vi.fn()}
      />,
    );

    expect(screen.getByText('Conexion perdida')).toBeTruthy();
    expect(screen.getByText('No se pudo restablecer la conexion')).toBeTruthy();
    expect(screen.getByText('Volver al inicio')).toBeTruthy();
  });

  it('llama onGoHome al clickear el boton', async () => {
    const onGoHome = vi.fn();
    render(
      <ReconnectingOverlay
        status="disconnected"
        attempt={5}
        maxAttempts={5}
        onGoHome={onGoHome}
      />,
    );

    fireEvent.click(screen.getByText('Volver al inicio'));
    expect(onGoHome).toHaveBeenCalledOnce();
  });

  it('tiene role alert y aria-live assertive', () => {
    render(
      <ReconnectingOverlay
        status="reconnecting"
        attempt={1}
        maxAttempts={5}
        onGoHome={vi.fn()}
      />,
    );

    const overlay = screen.getByRole('alert');
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('aria-live')).toBe('assertive');
  });
});
