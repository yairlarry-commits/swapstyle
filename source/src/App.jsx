import { Component, useEffect, useState } from 'react';
import { getLang, onLangChange } from './lib/i18n.js';
import { RefreshCw } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { RouterProvider, useRouter } from './context/RouterContext.jsx';
import { BottomNav, Logo } from './components/ui.jsx';
import { AuthScreen } from './screens/AuthScreen.jsx';
import { FeedScreen } from './screens/FeedScreen.jsx';
import { ItemScreen } from './screens/ItemScreen.jsx';
import { ProfileScreen } from './screens/ProfileScreen.jsx';
import { UploadScreen } from './screens/UploadScreen.jsx';
import { OffersScreen } from './screens/OffersScreen.jsx';
import { SwapScreen } from './screens/SwapScreen.jsx';
import { AdminScreen } from './screens/AdminScreen.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(e) {
    return { hasError: true, message: e.message || 'Something went wrong.' };
  }
  componentDidCatch(e, info) {
    console.error('SwapStyle crashed:', e, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-sand-50 px-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-float">
            <Logo size={44} container={false} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900">SwapStyle hit a snag</h1>
          <p className="mt-2 text-sm text-ink-500">The app ran into a problem while loading. This is usually fixed by reloading.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-ink-900 px-6 text-sm font-medium text-white transition active:scale-95"
          >
            <RefreshCw size={16} /> Reload app
          </button>
        </div>
      </div>
    );
  }
}

function Shell() {
  const { loading, user } = useAuth();
  const { route, reset } = useRouter();

  // every sign-in starts on the feed
  useEffect(() => {
    reset();
  }, [user?.id, reset]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Logo size={56} container={false} />
          <p className="text-xs font-medium tracking-wide text-ink-400">Loading SwapStyle…</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const showNav = ['feed', 'offers', 'upload'].includes(route.name) || (route.name === 'profile' && !route.userId);

  let screen;
  switch (route.name) {
    case 'item':
      screen = <ItemScreen itemId={route.itemId} />;
      break;
    case 'profile':
      screen = <ProfileScreen userId={route.userId} />;
      break;
    case 'upload':
      screen = <UploadScreen />;
      break;
    case 'offers':
      screen = <OffersScreen />;
      break;
    case 'swap':
      screen = <SwapScreen swapId={route.swapId} />;
      break;
    case 'admin':
      screen = <AdminScreen />;
      break;
    default:
      screen = <FeedScreen />;
  }

  return (
    <>
      <ErrorBoundary key={route.name + (route.itemId || route.userId || route.swapId || '')}>{screen}</ErrorBoundary>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const [lang, setLangState] = useState(getLang());
  useEffect(() => onLangChange(setLangState), []);
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider>
          <Shell key={lang} />
        </RouterProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
