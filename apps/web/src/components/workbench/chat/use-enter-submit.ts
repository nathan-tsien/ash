import { useCallback, useRef, type KeyboardEvent } from "react";

/**
 * Enter-to-submit handlers that are safe for IME composition.
 *
 * The Enter that confirms an IME candidate (Chinese/Japanese/Korean) also fires
 * keydown; submitting there would send a stale/partial draft AND preventDefault
 * would swallow the candidate selection. compositionend can fire before or after
 * keydown depending on the browser, so we combine a composition ref with the
 * native isComposing flag and the legacy 229 keyCode for IMEs that do not
 * surface isComposing on the confirming Enter.
 *
 * Spread the returned handlers onto an <input>/<textarea>. Shift+Enter is left
 * to the element's default behavior (newline).
 */
export function useEnterSubmit<T extends HTMLElement>(onSubmit: () => void) {
  const composingRef = useRef(false);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<T>) => {
      const composing =
        composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229;
      if (e.key === "Enter" && !e.shiftKey && !composing) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  return { onCompositionStart, onCompositionEnd, onKeyDown };
}
