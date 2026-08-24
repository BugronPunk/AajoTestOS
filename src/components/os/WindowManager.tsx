"use client";

import { AnimatePresence } from "framer-motion";
import { useOsStore } from "@/lib/os/store";
import { Window } from "@/components/os/Window";
import { NotesApp } from "@/components/apps/Notes/NotesApp";
import { MinesweeperApp } from "@/components/apps/Minesweeper/MinesweeperApp";
import { ChatApp } from "@/components/apps/Chat/ChatApp";
import { SettingsApp } from "@/components/apps/Settings/SettingsApp";
import { FilesApp } from "@/components/apps/Files/FilesApp";
import { TerminalApp } from "@/components/apps/Terminal/TerminalApp";
import { CalculatorApp } from "@/components/apps/Calculator/CalculatorApp";
import { MusicApp } from "@/components/apps/Music/MusicApp";
import { CalendarApp } from "@/components/apps/Calendar/CalendarApp";
import { ClockApp } from "@/components/apps/Clock/ClockApp";
import { PhotosApp } from "@/components/apps/Photos/PhotosApp";
import { PaintApp } from "@/components/apps/Paint/PaintApp";
import { WeatherApp } from "@/components/apps/Weather/WeatherApp";
import { MonitorApp } from "@/components/apps/Monitor/MonitorApp";
import { SnakeApp } from "@/components/apps/Snake/SnakeApp";
import {
  StickyNote,
  Bomb,
  MessageCircle,
  Cog,
  FolderClosed,
  TerminalSquare,
  Calculator,
  Music,
  Calendar,
  Clock,
  Image as ImageIcon,
  Paintbrush,
  CloudSun,
  Activity,
  Gamepad2,
} from "lucide-react";
import type { PublicUser } from "@/lib/types";

interface WindowManagerProps {
  user: PublicUser;
  onUpdateUser: (patch: Partial<PublicUser>) => void;
  onLogout: () => void;
}

export function WindowManager({
  user,
  onUpdateUser,
  onLogout,
}: WindowManagerProps) {
  const windows = useOsStore((s) => s.windows);

  return (
    <div className="absolute inset-0 top-9">
      <AnimatePresence>
        {windows.map((win) => (
          <Window key={win.id} win={win} icon={iconFor(win.appId)}>
            {renderApp(win.appId, { user, onUpdateUser, onLogout })}
          </Window>
        ))}
      </AnimatePresence>
    </div>
  );
}

function iconFor(appId: string) {
  switch (appId) {
    case "notes":
      return <StickyNote className="h-3.5 w-3.5" />;
    case "minesweeper":
      return <Bomb className="h-3.5 w-3.5" />;
    case "chat":
      return <MessageCircle className="h-3.5 w-3.5" />;
    case "settings":
      return <Cog className="h-3.5 w-3.5" />;
    case "files":
      return <FolderClosed className="h-3.5 w-3.5" />;
    case "terminal":
      return <TerminalSquare className="h-3.5 w-3.5" />;
    case "calculator":
      return <Calculator className="h-3.5 w-3.5" />;
    case "music":
      return <Music className="h-3.5 w-3.5" />;
    case "calendar":
      return <Calendar className="h-3.5 w-3.5" />;
    case "clock":
      return <Clock className="h-3.5 w-3.5" />;
    case "photos":
      return <ImageIcon className="h-3.5 w-3.5" />;
    case "paint":
      return <Paintbrush className="h-3.5 w-3.5" />;
    case "weather":
      return <CloudSun className="h-3.5 w-3.5" />;
    case "monitor":
      return <Activity className="h-3.5 w-3.5" />;
    case "snake":
      return <Gamepad2 className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function renderApp(
  appId: string,
  props: {
    user: PublicUser;
    onUpdateUser: (patch: Partial<PublicUser>) => void;
    onLogout: () => void;
  },
) {
  switch (appId) {
    case "notes":
      return <NotesApp userId={props.user.id} />;
    case "minesweeper":
      return (
        <MinesweeperApp
          userId={props.user.id}
          displayName={props.user.displayName}
        />
      );
    case "chat":
      return (
        <ChatApp userId={props.user.id} displayName={props.user.displayName} />
      );
    case "settings":
      return (
        <SettingsApp user={props.user} onUpdateUser={props.onUpdateUser} />
      );
    case "files":
      return <FilesApp userId={props.user.id} />;
    case "terminal":
      return (
        <TerminalApp
          userId={props.user.id}
          displayName={props.user.displayName}
        />
      );
    case "calculator":
      return <CalculatorApp userId={props.user.id} />;
    case "music":
      return <MusicApp userId={props.user.id} />;
    case "calendar":
      return <CalendarApp userId={props.user.id} />;
    case "clock":
      return <ClockApp userId={props.user.id} />;
    case "photos":
      return <PhotosApp userId={props.user.id} />;
    case "paint":
      return <PaintApp userId={props.user.id} />;
    case "weather":
      return <WeatherApp userId={props.user.id} />;
    case "monitor":
      return <MonitorApp userId={props.user.id} />;
    case "snake":
      return <SnakeApp userId={props.user.id} />;
    default:
      return null;
  }
}
