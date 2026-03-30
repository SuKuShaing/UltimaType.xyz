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
  const springState = useRef({ currentX: 0, currentY: 0, velocityX: 0, velocityY: 0, target: 0, initialized: false });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const colorRef = useRef('#FF9B51');
  const displayNameRef = useRef('');
  const disconnectedRef = useRef(false);

  const updateCaretPosition = (xPos: number, yPos: number) => {
    const transform = `translate(${xPos}px, ${yPos}px)`;
    if (caretRef.current) {
      caretRef.current.style.transform = transform;
    }
    if (labelRef.current) {
      labelRef.current.style.transform = `translate(${xPos}px, ${yPos - 18}px)`;
    }
    if (disconnectedLabelRef.current && disconnectedRef.current) {
      disconnectedLabelRef.current.style.transform = `translate(${xPos + 60}px, ${yPos - 18}px)`;
    }
  };

  const getCharPosition = (charIndex: number): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const spans = containerRef.current.querySelectorAll<HTMLSpanElement>('span[data-index]');
    const containerRect = containerRef.current.getBoundingClientRect();

    let span: HTMLSpanElement | null = null;
    let atEnd = false;

    if (charIndex < spans.length) {
      span = spans[charIndex];
    } else if (spans.length > 0) {
      span = spans[spans.length - 1];
      atEnd = true;
    }

    if (!span) return { x: 0, y: 0 };

    const spanRect = span.getBoundingClientRect();
    const x = atEnd
      ? spanRect.right - containerRect.left
      : spanRect.left - containerRect.left;
    const y = spanRect.top - containerRect.top;

    return { x, y };
  };

  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05); // Cap at 50ms
    lastTimeRef.current = time;

    const s = springState.current;
    const target = getCharPosition(s.target);

    // On first frame, snap to target to avoid jump from (0,0)
    if (!s.initialized) {
      s.currentX = target.x;
      s.currentY = target.y;
      s.initialized = true;
    }

    const resultX = springInterpolate(s.currentX, target.x, s.velocityX, 300, 25, dt);
    const resultY = springInterpolate(s.currentY, target.y, s.velocityY, 300, 25, dt);

    s.currentX = resultX.position;
    s.velocityX = resultX.velocity;
    s.currentY = resultY.position;
    s.velocityY = resultY.velocity;

    updateCaretPosition(s.currentX, s.currentY);

    // Continue animating if not settled
    const xSettled = Math.abs(resultX.velocity) < 0.01 && Math.abs(s.currentX - target.x) < 0.5;
    const ySettled = Math.abs(resultY.velocity) < 0.01 && Math.abs(s.currentY - target.y) < 0.5;

    if (!xSettled || !ySettled) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      s.currentX = target.x;
      s.currentY = target.y;
      s.velocityX = 0;
      s.velocityY = 0;
      updateCaretPosition(target.x, target.y);
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
      caretRef.current.className = `pointer-events-none absolute left-0 top-0${pulseClass ? ` ${pulseClass}` : ''}`;
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
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-xs font-medium"
        style={{ opacity: 0.7, transform: 'translate(0px, -18px)' }}
      />
      {/* Disconnected suffix label — hidden by default, shown via DOM */}
      <div
        ref={disconnectedLabelRef}
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-xs text-muted animate-pulse"
        style={{ display: 'none', opacity: 0.4, transform: 'translate(60px, -18px)' }}
        data-testid={`disconnected-label-${playerId}`}
      >
        (desconectado)
      </div>
      {/* Caret bar */}
      <div
        ref={caretRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{
          width: '2px',
          height: '1.2em',
          transform: 'translate(0px, 0px)',
          transition: 'none',
        }}
      />
    </>
  );
}
