import { useRef, useEffect, useCallback } from 'react';
import { arenaStore } from '../../hooks/use-arena-store';
import { getSocket } from '../../lib/socket';
import { WS_EVENTS } from '@ultimatype-monorepo/shared';

interface LiveTextCanvasProps {
  text: string;
  onPositionChange: (position: number) => void;
  isActive?: boolean;
  disabled?: boolean;
  caretColor?: string;
}

export function LiveTextCanvas({
  text,
  onPositionChange,
  isActive = true,
  disabled = false,
  caretColor = '#FF9B51',
}: LiveTextCanvasProps) {
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef(0);
  const errorsRef = useRef<Set<number>>(new Set());
  const localCaretRef = useRef<HTMLDivElement>(null);

  const localFinishedRef = useRef(false);
  const canType = isActive && !disabled && !localFinishedRef.current;

  const updateLocalCaret = useCallback((position: number) => {
    const caret = localCaretRef.current;
    if (!caret) return;

    let targetSpan: HTMLSpanElement | null = null;
    let atEnd = false;

    if (position < spanRefs.current.length) {
      targetSpan = spanRefs.current[position];
    } else if (spanRefs.current.length > 0) {
      targetSpan = spanRefs.current[spanRefs.current.length - 1];
      atEnd = true;
    }

    if (!targetSpan) return;

    const left = atEnd
      ? targetSpan.offsetLeft + targetSpan.offsetWidth
      : targetSpan.offsetLeft;
    const top = targetSpan.offsetTop;

    caret.style.transform = `translate(${left}px, ${top}px)`;
    caret.style.height = `${targetSpan.offsetHeight}px`;
  }, []);

  // Position caret initially once spans are rendered
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      updateLocalCaret(positionRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [text, updateLocalCaret]);

  // Focus the hidden input when race starts (AC1)
  useEffect(() => {
    if (canType) {
      // RAF ensures DOM is ready after countdown overlay removal
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [canType]);

  // Re-focus on tab return or any page click during active race (AC2)
  useEffect(() => {
    if (!canType) return;

    const refocus = (e?: Event) => {
      const target = e?.target as HTMLElement | null;
      if (
        target?.closest('button, a, input, select, textarea, [role="button"]')
      )
        return;
      inputRef.current?.focus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(refocus, 50);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', refocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', refocus);
    };
  }, [canType]);

  const handleContainerClick = useCallback(() => {
    if (canType) {
      inputRef.current?.focus();
    }
  }, [canType]);

  const colorChar = (index: number, color: string) => {
    const span = spanRefs.current[index];
    if (span) {
      span.style.color = color;
      span.style.opacity = '1';
    }
  };

  const resetChar = (index: number) => {
    const span = spanRefs.current[index];
    if (span) {
      span.style.color = '';
      span.style.opacity = '0.6';
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isActive || disabled || localFinishedRef.current) return;

      const pos = positionRef.current;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (pos > 0) {
          const newPos = pos - 1;
          resetChar(newPos);
          if (errorsRef.current.has(newPos)) {
            arenaStore.getState().decrementErrorKeystrokes();
          }
          errorsRef.current.delete(newPos);
          positionRef.current = newPos;
          onPositionChange(newPos);
          updateLocalCaret(newPos);
        }
        return;
      }

      // Ignore non-printable keys
      if (e.key.length !== 1) return;
      e.preventDefault();

      if (pos >= text.length) return;

      const expected = text[pos];
      const isCorrect = e.key === expected;

      if (isCorrect) {
        colorChar(pos, '#4ADE80'); // success green
        arenaStore.getState().incrementKeystrokes(true);
      } else {
        colorChar(pos, '#FB7185'); // error red
        errorsRef.current.add(pos);
        arenaStore.getState().incrementKeystrokes(false);
      }

      const newPos = pos + 1;
      positionRef.current = newPos;
      onPositionChange(newPos);
      updateLocalCaret(newPos);

      // Detect finish
      if (newPos === text.length) {
        localFinishedRef.current = true;
        arenaStore.getState().setLocalFinished();
        const { totalKeystrokes, errorKeystrokes } = arenaStore.getState();
        const socket = getSocket();
        socket.emit(WS_EVENTS.PLAYER_FINISH, {
          totalKeystrokes,
          errorKeystrokes,
        });
      }
    },
    [text, onPositionChange, isActive, disabled, updateLocalCaret],
  );

  return (
    <div
      className="relative mx-auto max-w-3xl cursor-text"
      onClick={handleContainerClick}
    >
      {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        type="text"
        className="absolute h-0 w-0 opacity-0"
        onKeyDown={handleKeyDown}
        readOnly
        aria-label="Área de escritura"
        tabIndex={0}
        disabled={!canType}
      />

      {/* Accessible twin for screen readers */}
      <p className="sr-only">{text}</p>

      {/* Visual character spans — blur when not active */}
      <div
        className="relative font-sans text-lg leading-[2.5] tracking-wide text-text-main"
        aria-hidden="true"
        style={{
          filter: isActive ? '' : 'blur(8px)',
          transition: 'filter 0.3s ease',
        }}
      >
        {text.split('').map((char, i) => (
          <span
            key={i}
            ref={(el) => {
              spanRefs.current[i] = el;
            }}
            style={{ opacity: 0.6, transition: 'color 0.05s' }}
            data-index={i}
          >
            {char}
          </span>
        ))}

        {/* Local player caret — hidden for spectators and disabled state */}
        {!disabled && (
          <div
            ref={localCaretRef}
            className="pointer-events-none absolute left-0 top-0"
            data-testid="local-caret"
            style={{
              width: '3px',
              height: '1.2em',
              backgroundColor: caretColor,
              borderRadius: '1px',
              transform: 'translate(0px, 0px)',
              boxShadow: `0 0 6px ${caretColor}99`,
              zIndex: 10,
              opacity: 0.65,
            }}
          />
        )}
      </div>
    </div>
  );
}
