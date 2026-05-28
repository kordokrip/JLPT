import { Home, Calendar, RotateCcw, Search, Settings } from 'lucide-react';

interface MobileNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export function MobileNav({ activeScreen, onNavigate }: MobileNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: '今日' },
    { id: 'curriculum', icon: Calendar, label: '計画' },
    { id: 'review', icon: RotateCcw, label: '復習' },
    { id: 'browse', icon: Search, label: '検索' },
    { id: 'settings', icon: Settings, label: '設定' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeScreen === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 py-2 relative ${
              isActive ? 'text-foreground' : 'text-muted'
            }`}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.5} />
            <span className="font-sans-jp text-[11px]">{item.label}</span>
            {isActive && (
              <div className="absolute bottom-0 w-1 h-1 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
