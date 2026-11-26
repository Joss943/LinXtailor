import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Scissor } from 'iconoir-react';
import type { Detection, DryRunResult, Profile } from './types';
import Toast, { type ToastMessage } from './components/Toast';
import Welcome from './screens/Welcome';
import Unsupported from './screens/Unsupported';
import PersonaScreen from './screens/Persona';
import Quiz from './screens/Quiz';
import Customize from './screens/Customize';
import DryRun from './screens/DryRun';
import Progress from './screens/Progress';
import Done from './screens/Done';

interface AppState {
  detection: Detection | null;
  setDetection: (d: Detection | null) => void;
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  dryrun: DryRunResult | null;
  setDryrun: (r: DryRunResult | null) => void;
  notify: (t: ToastMessage) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp hors du fournisseur');
  return v;
}

/** Empêche d'arriver sur un écran sans la détection (ou le profil) nécessaire. */
function Guard({ need, children }: { need: 'detection' | 'profile' | 'dryrun'; children: ReactNode }) {
  const { detection, profile, dryrun } = useApp();
  if (!detection) return <Navigate to="/" replace />;
  if ((need === 'profile' || need === 'dryrun') && !profile) return <Navigate to="/profil" replace />;
  if (need === 'dryrun' && !dryrun) return <Navigate to="/apercu" replace />;
  return <>{children}</>;
}

export default function App() {
  const [detection, setDetection] = useState<Detection | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dryrun, setDryrun] = useState<DryRunResult | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <Ctx.Provider
      value={{ detection, setDetection, profile, setProfile, dryrun, setDryrun, notify: setToast }}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Scissor className="text-indigo-700" aria-hidden="true" />
          <span className="text-lg font-semibold">LinXtailor</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/non-pris-en-charge" element={<Unsupported />} />
          <Route path="/profil" element={<Guard need="detection"><PersonaScreen /></Guard>} />
          <Route path="/personnaliser" element={<Guard need="profile"><Customize /></Guard>} />
          <Route path="/questions/:step" element={<Guard need="profile"><Quiz /></Guard>} />
          <Route path="/apercu" element={<Guard need="profile"><DryRun /></Guard>} />
          <Route path="/application" element={<Guard need="dryrun"><Progress /></Guard>} />
          <Route path="/termine" element={<Guard need="profile"><Done /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toast toast={toast} onClose={closeToast} />
    </Ctx.Provider>
  );
}
