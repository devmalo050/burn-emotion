'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { computeJoystickVector, MAX_RADIUS, DEAD_ZONE } from './touch-vector';
import styles from './TouchControls.module.css';

type JoyRef = MutableRefObject<{ x: number; y: number; active: boolean }>;

export default function TouchControls({
  joystickRef,
  onJump,
  enabled,
}: {
  joystickRef: JoyRef;
  onJump: () => void;
  enabled: boolean;
}) {
  const knobRef = useRef<HTMLDivElement | null>(null);
  const pidRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      pidRef.current = null;
      joystickRef.current.active = false;
      joystickRef.current.x = 0;
      joystickRef.current.y = 0;
    };

    const isInteractive = (t: EventTarget | null) =>
      t instanceof Element &&
      t.closest('button, input, textarea, a, select, [role="button"], [data-no-joystick]');

    const onDown = (e: PointerEvent) => {
      if (pidRef.current !== null) return;
      if (e.clientX > window.innerWidth / 2) return;
      if (isInteractive(e.target)) return;
      pidRef.current = e.pointerId;
      originRef.current = { x: e.clientX, y: e.clientY };
      joystickRef.current.active = true;
      joystickRef.current.x = 0;
      joystickRef.current.y = 0;
      setBase({ x: e.clientX, y: e.clientY });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pidRef.current) return;
      const o = originRef.current;
      const v = computeJoystickVector(o.x, o.y, e.clientX, e.clientY, MAX_RADIUS, DEAD_ZONE);
      joystickRef.current.x = v.x;
      joystickRef.current.y = v.y;
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${v.x * MAX_RADIUS}px, ${-v.y * MAX_RADIUS}px)`;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pidRef.current) return;
      reset();
      setBase(null);
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      reset();
      setBase(null);
    };
  }, [enabled, joystickRef]);

  if (!enabled) return null;

  return (
    <>
      {base && (
        <div className={styles.joyBase} style={{ left: base.x, top: base.y }}>
          <div ref={knobRef} className={styles.joyKnob} />
        </div>
      )}
      <button
        type="button"
        className={styles.jumpBtn}
        aria-label="점프"
        onPointerDown={(e) => {
          e.preventDefault();
          onJump();
        }}
      >
        <svg className={styles.jumpIcon} viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path
            d="M6 16.5 L14 8.5 L22 16.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 21 L14 13 L22 21"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
        </svg>
      </button>
    </>
  );
}
