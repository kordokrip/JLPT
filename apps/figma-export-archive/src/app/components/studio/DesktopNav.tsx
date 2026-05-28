import { Home, Calendar, RotateCcw, Search, Settings } from 'lucide-react';

interface DesktopNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export function DesktopNav({ activeScreen, onNavigate }: DesktopNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: '今日', sublabel: 'Home' },
    { id: 'curriculum', icon: Calendar, label: '計画', sublabel: 'Curriculum' },
    { id: 'review', icon: RotateCcw, label: '復習', sublabel: 'Review' },
    { id: 'browse', icon: Search, label: '検索', sublabel: 'Browse' },
    { id: 'settings', icon: Settings, label: '設定', sublabel: 'Settings' },
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[128px] bg-card border-r-[0.5px] border-border flex flex-col">
      {/* Logo */}
      <div className="h-[52px] flex items-center justify-center px-3 border-b-[0.5px] border-border">
        <h1 className="font-serif-jp text-[13px] font-normal text-foreground tracking-[0.02em]">
          日本語 N3
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full py-2.5 flex flex-col items-center gap-0.5 transition-all relative ${
                isActive
                  ? 'text-foreground bg-card'
                  : 'text-muted hover:text-foreground hover:bg-background/50'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent" />
              )}
              <Icon className="w-[15px] h-[15px]" strokeWidth={1.5} />
              <span className="font-sans-jp text-[13px] leading-none">{item.label}</span>
              <span className="text-[9px] leading-none tracking-[0.08em] opacity-60">{item.sublabel}</span>
            </button>
          );
        })}
      </nav>

      {/* User Block */}
      <div className="p-3 border-t-[0.5px] border-border flex items-center gap-2">
        <div className="w-[26px] h-[26px] rounded-full bg-accent flex items-center justify-center text-accent-foreground text-[10px] font-semibold flex-shrink-0">
          성
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium leading-tight">성호</div>
          <div className="text-[9px] text-muted leading-tight">Week 7/16</div>
        </div>
      </div>
    </div>
  );
}
