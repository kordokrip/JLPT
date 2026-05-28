import { useState } from 'react';
import { DesktopNav } from './components/studio/DesktopNav';
import { MobileNav } from './components/studio/MobileNav';
import { HomeScreen } from './screens/studio/HomeScreen';
import { CurriculumScreen } from './screens/studio/CurriculumScreen';
import { BrowseScreen } from './screens/studio/BrowseScreen';
import { ReviewScreen } from './screens/studio/ReviewScreen';
import { GrammarScreen } from './screens/studio/GrammarScreen';
import { SelfCheckScreen } from './screens/studio/SelfCheckScreen';
import { SettingsScreen } from './screens/studio/SettingsScreen';
import { Search } from 'lucide-react';

export default function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [navigationData, setNavigationData] = useState<any>(null);

  const handleNavigate = (screen: string, data?: any) => {
    setActiveScreen(screen);
    setNavigationData(data || null);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;
      case 'curriculum':
        return <CurriculumScreen onNavigate={handleNavigate} />;
      case 'review':
        return <ReviewScreen onNavigate={handleNavigate} />;
      case 'browse':
        return <BrowseScreen onNavigate={handleNavigate} />;
      case 'grammar':
        return <GrammarScreen onNavigate={handleNavigate} />;
      case 'selfcheck':
        return <SelfCheckScreen onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsScreen onNavigate={handleNavigate} />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout (≥1024px) */}
      <div className="hidden lg:flex">
        <DesktopNav activeScreen={activeScreen} onNavigate={handleNavigate} />

        <div className="flex-1 ml-[128px]">
          {/* Top Search Bar */}
          <div className="h-[46px] border-b-[0.5px] border-border flex items-center px-6">
            <div className="max-w-[240px] w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="検索..."
                className="w-full h-9 pl-9 pr-4 bg-background border-[0.5px] border-border rounded-full text-[12px] focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Screen Content */}
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 46px)' }}>
            {renderScreen()}
          </div>
        </div>
      </div>

      {/* Mobile Layout (<1024px) */}
      <div className="lg:hidden">
        {/* Top Search Bar */}
        <div className="h-14 border-b border-border flex items-center px-4 bg-card">
          <div className="w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="検索..."
              className="w-full h-9 pl-10 pr-4 bg-background border border-border rounded-lg text-[13px] focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Screen Content */}
        <div className="overflow-y-auto pb-16" style={{ height: 'calc(100vh - 56px - 64px)' }}>
          {renderScreen()}
        </div>

        {/* Bottom Navigation */}
        <MobileNav activeScreen={activeScreen} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}