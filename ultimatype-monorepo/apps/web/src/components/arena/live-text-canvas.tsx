import { useRef, useEffect, useCallback } from 'react';

interface LiveTextCanvasProps {
  text: string;
  onPositionChange: (position: number) => void;
  disabled?: boolean;
}

export function LiveTextCanvas({
  text,
  onPositionChange,
  disabled = false,
}: LiveTextCanvasProps) {
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef(0);
  const errorsRef = useRef<Set<number>>(new Set());

  // Focus the hidden input on mount and when clicking the text area
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

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
      if (disabled) return;

      const pos = positionRef.current;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (pos > 0) {
          const newPos = pos - 1;
          resetChar(newPos);
          errorsRef.current.delete(newPos);
          positionRef.current = newPos;
          onPositionChange(newPos);
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
      } else {
        colorChar(pos, '#FB7185'); // error red
        errorsRef.current.add(pos);
      }

      const newPos = pos + 1;
      positionRef.current = newPos;
      onPositionChange(newPos);
    },
    [text, onPositionChange, disabled],
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
        disabled={disabled}
      />

      {/* Accessible twin for screen readers */}
      <p className="sr-only">{text}</p>

      {/* Visual character spans */}
      <div
        className="relative font-sans text-lg leading-relaxed tracking-wide text-text-main"
        aria-hidden="true"
      >
        {text.split('').map((char, i) => (
          <span
            key={i}
            ref={(el) => { spanRefs.current[i] = el; }}
            style={{ opacity: 0.6, transition: 'color 0.05s' }}
            data-index={i}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
