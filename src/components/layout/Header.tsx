import { LogOut, Settings, Timer } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/useAuthStore";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import type { AppView } from "@/App";

interface HeaderProps {
  view: AppView;
  onViewChange: (view: AppView) => void;
}

export function Header({ view, onViewChange }: HeaderProps) {
  const { signOut, user } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-glass-border bg-ink/55 backdrop-blur-2xl backdrop-saturate-150 shadow-glass-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-focus/15 text-focus">
            <Timer className="h-4 w-4" />
          </div>
          <a href="/" className="font-display text-base font-medium text-paper">Flow</a>
        </div>

        <Tabs value={view} onValueChange={(v) => onViewChange(v as AppView)}>
          <TabsList>
            <TabsTrigger value="dashboard">Blocks</TabsTrigger>
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs text-muted sm:inline">{user?.email}</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/10 hover:text-paper"
            title="Default ratio settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={signOut}
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/10 hover:text-paper"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
