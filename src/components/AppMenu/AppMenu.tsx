'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './AppMenu.module.css';

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        aria-label="메뉴"
        aria-expanded={open}
        aria-controls="app-menu-panel"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </button>
      <nav
        id="app-menu-panel"
        className={styles.panel}
        hidden={!open}
        aria-hidden={!open}
      >
        <ul className={styles.list}>
          <li>
            <Link
              href="/guide"
              className={styles.item}
              onClick={() => setOpen(false)}
            >
              이용가이드
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
