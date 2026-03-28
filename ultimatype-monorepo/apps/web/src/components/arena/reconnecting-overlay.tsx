interface ReconnectingOverlayProps {
  status: 'reconnecting' | 'disconnected';
  attempt: number;
  maxAttempts: number;
  onGoHome: () => void;
}

export function ReconnectingOverlay({
  status,
  attempt,
  maxAttempts,
  onGoHome,
}: ReconnectingOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-base/90 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
    >
      {status === 'reconnecting' ? (
        <>
          <span className="mb-4 animate-pulse text-4xl text-primary">_</span>
          <p className="text-2xl font-bold text-on-surface">Reconectando...</p>
          {attempt > 0 && (
            <p className="mt-2 text-muted">
              Intento {attempt} de {maxAttempts}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-on-surface">
            Conexion perdida
          </p>
          <p className="mt-2 text-muted">
            No se pudo restablecer la conexion
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-primary px-8 py-3 text-xl font-bold text-surface-base"
            onClick={onGoHome}
            autoFocus
          >
            Volver al inicio
          </button>
        </>
      )}
    </div>
  );
}
