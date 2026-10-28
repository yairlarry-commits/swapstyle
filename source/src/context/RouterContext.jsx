// Tiny stack-based router: { name: 'feed' | 'offers' | 'upload' | 'profile' | 'item', ...params }
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const RouterContext = createContext(undefined);

// Open overlays (sheets, camera), newest last: the Back button closes these first.
const overlays = [];

export function RouterProvider({ children }) {
  const [stack, setStack] = useState([{ name: 'feed' }]);
  const depth = useRef(1);
  depth.current = stack.length;
  const stackRef = useRef(stack);
  stackRef.current = stack;

  // Every screen is a browser-history entry, so the phone's Back button goes to the previous screen
  // and only leaves the app from the feed.
  const toRoot = useCallback(() => {
    if (depth.current > 1) window.history.go(-(depth.current - 1)); // popstate trims the stack
    else setStack([{ name: 'feed' }]);
  }, []);

  const navigate = useCallback(
    (route) => {
      if (route.name === 'feed') return toRoot();
      const top = stackRef.current[stackRef.current.length - 1];
      if (JSON.stringify(top) === JSON.stringify(route)) return; // already here
      setStack((s) => [...s, route]);
      window.history.pushState({ depth: depth.current + 1 }, '');
      window.scrollTo({ top: 0 });
    },
    [toRoot]
  );

  // back to the feed with a clean history (e.g. after signing in as someone else)
  const reset = toRoot;

  const back = useCallback(() => {
    if (depth.current > 1) window.history.back();
  }, []);

  useEffect(() => {
    window.history.replaceState({ depth: 1 }, '');
    const onPop = (e) => {
      const d = Math.max(1, e.state?.depth ?? 1);
      setStack((s) => (d < s.length ? s.slice(0, d) : s));
    };
    window.addEventListener('popstate', onPop);
    // The Android app calls this for the phone's Back button: true = handled inside SwapStyle
    window.swapstyleBack = () => {
      const top = overlays[overlays.length - 1];
      if (top) {
        top.current?.();
        return true;
      }
      if (depth.current > 1) {
        window.history.back();
        return true;
      }
      return false;
    };
    return () => {
      window.removeEventListener('popstate', onPop);
      delete window.swapstyleBack;
    };
  }, []);

  return (
    <RouterContext.Provider value={{ route: stack[stack.length - 1], navigate, back, reset, canGoBack: stack.length > 1 }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

// Lets the phone's Back button close an overlay (sheet, camera) instead of leaving the screen.
export function useBackToClose(open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    overlays.push(closeRef);
    window.history.pushState({ depth: window.history.state?.depth ?? 1, overlay: true }, '');
    let popped = false;
    const onPop = () => {
      popped = true;
      closeRef.current?.();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      const i = overlays.lastIndexOf(closeRef);
      if (i >= 0) overlays.splice(i, 1);
      window.removeEventListener('popstate', onPop);
      // closed with a button: drop the extra history entry we added
      if (!popped && window.history.state?.overlay) window.history.back();
    };
  }, [open]);
}
