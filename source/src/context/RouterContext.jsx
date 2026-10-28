// Tiny stack-based router: { name: 'feed' | 'offers' | 'upload' | 'profile' | 'item', ...params }
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const RouterContext = createContext(undefined);

export function RouterProvider({ children }) {
  const [stack, setStack] = useState([{ name: 'feed' }]);

  const navigate = useCallback((route) => {
    setStack((s) => (s[s.length - 1].name === route.name && route.name === 'feed' ? [{ name: 'feed' }] : [...s, route]));
    window.scrollTo({ top: 0 });
  }, []);

  // back to the feed with a clean history (e.g. after signing in as someone else)
  const reset = useCallback(() => setStack([{ name: 'feed' }]), []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  useEffect(() => {
    window.history.replaceState({ stack: stack.length }, '');
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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
