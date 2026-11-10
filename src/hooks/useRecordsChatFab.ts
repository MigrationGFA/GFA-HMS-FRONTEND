import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const POS_KEY = 'gfa_records_chat_pos';
const HIDDEN_KEY = 'gfa_records_chat_hidden';
const FAB_SIZE = 56;
const MARGIN = 16;
const DRAG_THRESHOLD = 5;

export interface ChatFabPos {
  x: number;
  y: number;
}

function defaultPos(): ChatFabPos {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  return {
    x: Math.max(MARGIN, window.innerWidth - FAB_SIZE - 24),
    y: Math.max(MARGIN, window.innerHeight - FAB_SIZE - 24),
  };
}

function clampPos(x: number, y: number, size = FAB_SIZE): ChatFabPos {
  const maxX = Math.max(MARGIN, window.innerWidth - size - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - size - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

function loadPos(): ChatFabPos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return defaultPos();
    const parsed = JSON.parse(raw) as ChatFabPos;
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return defaultPos();
    return clampPos(parsed.x, parsed.y);
  } catch {
    return defaultPos();
  }
}

function savePos(pos: ChatFabPos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch { /* noop */ }
}

function loadHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function saveHidden(hidden: boolean) {
  try {
    localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
  } catch { /* noop */ }
}

export function useRecordsChatFab() {
  const [pos, setPos] = useState<ChatFabPos>(() => loadPos());
  const [hidden, setHidden] = useState(() => loadHidden());
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setHiddenState = useCallback((next: boolean) => {
    setHidden(next);
    saveHidden(next);
  }, []);

  const hide = useCallback(() => setHiddenState(true), [setHiddenState]);
  const show = useCallback(() => setHiddenState(false), [setHiddenState]);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
      pointerId: e.pointerId,
    };
    didDragRef.current = false;
    setDragging(true);
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    didDragRef.current = true;
    setPos(clampPos(d.originX + dx, d.originY + dy));
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* noop */ }
    if (d.moved) {
      setPos((p) => {
        const next = clampPos(p.x, p.y);
        savePos(next);
        return next;
      });
    }
    dragRef.current = null;
    setDragging(false);
  }, []);

  /** Returns true if the pointer interaction was a tap (not a drag). */
  const consumeTap = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return false;
    }
    return true;
  }, []);

  return {
    pos,
    hidden,
    dragging,
    hide,
    show,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    consumeTap,
    fabSize: FAB_SIZE,
  };
}
