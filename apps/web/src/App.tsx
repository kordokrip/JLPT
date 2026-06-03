import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';

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
const NotFound       = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────
// 루트 라우터
// ─────────────────────────────────────────────
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index          element={<Home />} />
          <Route path="review"  element={<Review />} />
          <Route path="browse/:type"     element={<Browse />} />
          <Route path="browse/:type/:id" element={<BrowseDetail />} />
          <Route path="curriculum"       element={<Curriculum />} />
          <Route path="curriculum/:week" element={<Curriculum />} />
          <Route path="self-check"       element={<SelfCheck />} />
          <Route path="self-check/:week" element={<SelfCheck />} />
          <Route path="settings"         element={<Settings />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
