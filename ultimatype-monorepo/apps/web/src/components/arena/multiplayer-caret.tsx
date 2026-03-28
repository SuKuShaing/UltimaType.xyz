import { useEffect, useRef } from 'react';
import { arenaStore } from '../../hooks/use-arena-store';
import { PLAYER_COLORS } from '@ultimatype-monorepo/shared';

interface MultiplayerCaretProps {
  playerId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function springInterpolate(
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  damping: number,
  dt: number,
): { position: number; velocity: number } {
  const force = -stiffness * (current - target);
  const dampingForce = -damping * velocity;
  const acceleration = force + dampingForce;
  const newVelocity = velocity + acceleration * dt;
  const newPosition = current + newVelocity * dt;
  return { position: newPosition, velocity: newVelocity };
}

export function MultiplayerCaret({ playerId, containerRef }: MultiplayerCaretProps) {
  const caretRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const disconnectedLabelRef = useRef<HTMLDivElement>(null);
  const springState = useRef({ current: 0, velocity: 0, target: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const colorRef = useRef('#FF9B51');
  const displayNameRef = useRef('');
  const disconnectedRef = useRef(false);

  const updateCaretPosition = (xPos: number) => {
    if (caretRef.current) {
      caretRef.current.style.transform = `translateX(${xPos}px)`;
    }
    if (labelRef.current) {
      labelRef.current.style.transform = `translateX(${xPos}px)`;
    }
  };

  const getCharX = (charIndex: number): number => {
    if (!containerRef.current) return 0;
    const spans = containerRef.current.querySelectorAll<HTMLSpanElement>('span[data-index]');
    if (charIndex < spans.length) {
      const span = spans[charIndex];
      return span.offsetLeft;
    }
    // If past last char, position after the last span
    if (spans.length > 0) {
      const lastSpan = spans[spans.length - 1];
      return lastSpan.offsetLeft + lastSpan.offsetWidth;
    }
    return 0;
  };

  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05); // Cap at 50ms
    lastTimeRef.current = time;

    const s = springState.current;
    const targetX = getCharX(s.target);
    const result = springInterpolate(s.current, targetX, s.velocity, 300, 25, dt);

    s.current = result.position;
    s.velocity = result.velocity;

    updateCaretPosition(s.current);

    // Continue animating if not settled
    if (Math.abs(result.velocity) > 0.01 || Math.abs(s.current - targetX) > 0.5) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      s.current = targetX;
      s.velocity = 0;
      updateCaretPosition(targetX);
      rafRef.current = null;
    }
  };

  const startAnimation = () => {
    if (rafRef.current === null) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }
  };

  const applyDisconnectedVisuals = (isDisconnected: boolean) => {
    disconnectedRef.current = isDisconnected;
    const opacity = isDisconnected ? '0.4' : '1';
    const labelOpacity = isDisconnected ? '0.4' : '0.7';
    const pulseClass = isDisconnected ? 'animate-pulse' : '';

    if (caretRef.current) {
      caretRef.current.style.opacity = opacity;
      caretRef.current.className = `pointer-events-none absolute top-0${pulseClass ? ` ${pulseClass}` : ''}`;
    }
    if (labelRef.current) {
      labelRef.current.style.opacity = labelOpacity;
    }
    if (disconnectedLabelRef.current) {
      disconnectedLabelRef.current.style.display = isDisconnected ? '' : 'none';
    }
  };

  // Subscribe to store changes (transient pattern — no re-renders)
  useEffect(() => {
    // Read color and displayName after mount (post-initArena)
    const playerInfo = arenaStore.getState().players[playerId];
    if (playerInfo) {
      colorRef.current = PLAYER_COLORS[playerInfo.colorIndex] ?? '#FF9B51';
      displayNameRef.current = playerInfo.displayName;
      if (caretRef.current) caretRef.current.style.backgroundColor = colorRef.current;
      if (labelRef.current) {
        labelRef.current.style.color = colorRef.current;
        labelRef.current.textContent = displayNameRef.current;
      }
      applyDisconnectedVisuals(playerInfo.disconnected);
    }

    const unsubscribe = arenaStore.subscribe((state) => {
      const player = state.players[playerId];
      if (!player) return;
      if (player.position !== springState.current.target) {
        springState.current.target = player.position;
        startAnimation();
      }
      if (player.disconnected !== disconnectedRef.current) {
        applyDisconnectedVisuals(player.disconnected);
      }
    });

    return () => {
      unsubscribe();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  return (
    <>
      {/* Player name label */}
      <div
        ref={labelRef}
        className="pointer-events-none absolute -top-5 whitespace-nowrap text-xs font-medium"
        style={{ opacity: 0.7, transform: 'translateX(0px)' }}
      />
      {/* Disconnected suffix label — hidden by default, shown via DOM */}
      <div
        ref={disconnectedLabelRef}
        className="pointer-events-none absolute -top-5 whitespace-nowrap text-xs text-muted animate-pulse"
        style={{ display: 'none', opacity: 0.4, transform: 'translateX(0px)' }}
        data-testid={`disconnected-label-${playerId}`}
      >
        (desconectado)
      </div>
      {/* Caret bar */}
      <div
        ref={caretRef}
        className="pointer-events-none absolute top-0"
        style={{
          width: '2px',
          height: '1.2em',
          transform: 'translateX(0px)',
          transition: 'none',
        }}
      />
    </>
  );
}
