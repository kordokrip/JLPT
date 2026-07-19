import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { useAuthStore } from './stores/auth-store';
import type { ReactNode } from 'react';
import { useSettingsStore } from './stores/settings-store';

// ─────────────────────────────────────────────
// Lazy 페이지 로드
// ─────────────────────────────────────────────
const Home        = lazy(() => import('./pages/Home'));
const Review      = lazy(() => import('./pages/Review'));
const Browse      = lazy(() => import('./pages/Browse'));
const BrowseDetail = lazy(() => import('./pages/BrowseDetail'));
const Curriculum  = lazy(() => import('./pages/Curriculum'));
const SelfCheck   = lazy(() => import('./pages/SelfCheck'));
const Settings    = lazy(() => import('./pages/Settings'));
const Quiz           = lazy(() => import('./pages/Quiz'));
const QuizResult     = lazy(() => import('./pages/QuizResult'));
const QuizListening  = lazy(() => import('./pages/QuizListening'));
const CharacterTrainer = lazy(() => import('./pages/CharacterTrainer'));
const Reading        = lazy(() => import('./pages/Reading'));
const ReadingDetail  = lazy(() => import('./pages/ReadingDetail'));
const Stats          = lazy(() => import('./pages/Stats'));
const AddWord        = lazy(() => import('./pages/AddWord'));
const AudioQa        = lazy(() => import('./pages/AudioQa'));
const Welcome        = lazy(() => import('./pages/Welcome'));
const Login          = lazy(() => import('./pages/Login'));
const Register       = lazy(() => import('./pages/Register'));
const AdminUsers     = lazy(() => import('./pages/AdminUsers'));
const TopikDashboard  = lazy(() => import('./pages/TopikDashboard'));
const TopikPlacement  = lazy(() => import('./pages/TopikPlacement'));
const TopikLearn      = lazy(() => import('./pages/TopikLearn'));
const TopikReview     = lazy(() => import('./pages/TopikReview'));
const TopikProgress   = lazy(() => import('./pages/TopikProgress'));
const NotFound       = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const status = useAuthStore((s) => s.status);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    if (status === 'checking') void refresh();
  }, [status, refresh]);

  if (status === 'checking') return <PageLoader />;
  if (status === 'anonymous') return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireJlptTrack() {
  const learningTrack = useSettingsStore((state) => state.learningTrack);
  return learningTrack === 'jlpt-ja'
    ? <Outlet />
    : <Navigate to="/track/topik-ko" replace />;
}

function RequireTopikTrack() {
  const learningTrack = useSettingsStore((state) => state.learningTrack);
  return learningTrack === 'topik-ko' ? <Outlet /> : <Navigate to="/" replace />;
}

// ─────────────────────────────────────────────
// 루트 라우터
// ─────────────────────────────────────────────
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="welcome" element={<Welcome />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route element={<RequireAuth><RootLayout /></RequireAuth>}>
          <Route path="settings"         element={<Settings />} />
          <Route path="admin/users"  element={<AdminUsers />} />
          <Route element={<RequireTopikTrack />}>
            <Route path="track/topik-ko" element={<TopikDashboard />} />
            <Route path="track/topik-ko/placement" element={<TopikPlacement />} />
            <Route path="track/topik-ko/learn" element={<TopikLearn />} />
            <Route path="track/topik-ko/review" element={<TopikReview />} />
            <Route path="track/topik-ko/progress" element={<TopikProgress />} />
          </Route>
          <Route element={<RequireJlptTrack />}>
            <Route index          element={<Home />} />
            <Route path="review"  element={<Review />} />
            <Route path="browse/:type"     element={<Browse />} />
            <Route path="browse/:type/:id" element={<BrowseDetail />} />
            <Route path="curriculum"       element={<Curriculum />} />
            <Route path="curriculum/:week" element={<Curriculum />} />
            <Route path="self-check"       element={<SelfCheck />} />
            <Route path="self-check/:week" element={<SelfCheck />} />
            <Route path="quiz"             element={<Quiz />} />
            <Route path="quiz/:mode"       element={<Quiz />} />
            <Route path="quiz/result/:attemptId" element={<QuizResult />} />
            <Route path="quiz/listening/:quizId" element={<QuizListening />} />
            <Route path="quiz/listening"         element={<QuizListening />} />
            <Route path="characters"   element={<CharacterTrainer />} />
            <Route path="reading"      element={<Reading />} />
            <Route path="reading/:id"  element={<ReadingDetail />} />
            <Route path="stats"        element={<Stats />} />
            <Route path="add-word"     element={<AddWord />} />
            <Route path="audio-qa"     element={<AudioQa />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
