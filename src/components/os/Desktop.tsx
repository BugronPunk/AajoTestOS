"use client";

import { useState } from "react";
import { MenuBar } from "@/components/os/MenuBar";
import { Dock } from "@/components/os/Dock";
import { WindowManager } from "@/components/os/WindowManager";
import { ControlCenter } from "@/components/os/ControlCenter";
import { Spotlight } from "@/components/os/Spotlight";
import { NotificationCenter } from "@/components/os/NotificationCenter";
import { DesktopWidget } from "@/components/os/DesktopWidget";
import { DesktopContextMenu } from "@/components/os/DesktopContextMenu";
import { AboutDialog } from "@/components/os/AboutDialog";
import type { PublicUser } from "@/lib/types";

interface DesktopProps {
  user: PublicUser;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onLock: () => void;
  onUpdateUser: (patch: Partial<PublicUser>) => void;
}

export function Desktop({
  user,
  isDark,
  onToggleTheme,
  onLogout,
  onLock,
  onUpdateUser,
}: DesktopProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <div className="relative h-full w-full select-none">
      <DesktopWidget />
      <MenuBar
        user={user}
        onLogout={onLogout}
        onLock={onLock}
        onAbout={() => setAboutOpen(true)}
      />
      <WindowManager
        user={user}
        onUpdateUser={onUpdateUser}
        onLogout={onLogout}
      />
      <ControlCenter />
      <Spotlight onLock={onLock} onLogout={onLogout} />
      <NotificationCenter user={user} />
      <DesktopContextMenu onToggleTheme={onToggleTheme} isDark={isDark} />
      <AboutDialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        username={user.username}
      />
      <Dock />
    </div>
  );
}
