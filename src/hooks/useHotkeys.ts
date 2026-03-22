import { useEffect } from 'react';

type HotkeyHandler = (e: KeyboardEvent) => void;

interface Hotkey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: HotkeyHandler;
}

export function useHotkeys(hotkeys: Hotkey[], deps: unknown[] = []) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        const ctrlMatch = hk.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = hk.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = hk.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === hk.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          hk.handler(e);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
