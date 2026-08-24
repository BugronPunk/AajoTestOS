"use client";

import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n/context";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollArea";

interface CalendarAppProps {
  userId: string;
}

interface CalEvent {
  id: string;
  date: string;
  title: string;
  time: string;
  color: string;
}

const EVENT_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

const WEEKDAY_KEYS = [
  "calendar.sunday",
  "calendar.monday",
  "calendar.tuesday",
  "calendar.wednesday",
  "calendar.thursday",
  "calendar.friday",
  "calendar.saturday",
];

const MONTH_NAMES = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  fr: [
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre",
  ],
  zh: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
};

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarApp({ userId }: CalendarAppProps) {
  const { t, locale } = useI18n();
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(
    dateKey(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [events, setEvents] = useState<CalEvent[]>([
    {
      id: "e1",
      date: dateKey(today.getFullYear(), today.getMonth(), today.getDate()),
      title: "Welcome to AajoTestOS",
      time: "09:00",
      color: EVENT_COLORS[0],
    },
    {
      id: "e2",
      date: dateKey(today.getFullYear(), today.getMonth(), today.getDate() + 2),
      title: "Team standup",
      time: "10:30",
      color: EVENT_COLORS[1],
    },
    {
      id: "e3",
      date: dateKey(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      title: "Design review",
      time: "14:00",
      color: EVENT_COLORS[2],
    },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("12:00");
  const [newColor, setNewColor] = useState(0);

  void userId;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const months = MONTH_NAMES[locale];

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, key: "empty-" + i });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: dateKey(year, month, d) });
    }
    return cells;
  }, [year, month]);

  const eventsForSelected = events.filter((e) => e.date === selectedDate);
  const todayKey = dateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  const addEvent = () => {
    if (!newTitle.trim()) return;
    setEvents((prev) => [
      ...prev,
      {
        id: "e" + Date.now(),
        date: selectedDate,
        title: newTitle.trim(),
        time: newTime,
        color: EVENT_COLORS[newColor],
      },
    ]);
    setNewTitle("");
    setShowAddForm(false);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40 md:flex-row">
      {/* Calendar grid */}
      <div className="flex flex-1 flex-col p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {months[month]} {year}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToday}
              className="mr-2 text-xs"
            >
              {t("calendar.today")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              className="py-1.5 text-center text-[11px] font-semibold uppercase text-slate-400"
            >
              {t(key)}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid flex-1 grid-cols-7 gap-1">
          {calendar.map((cell) => {
            const dayEvents = cell.day
              ? events.filter((e) => e.date === cell.key)
              : [];
            const isToday = cell.key === todayKey;
            const isSelected = cell.key === selectedDate;
            return (
              <button
                key={cell.key}
                onClick={() => cell.day && setSelectedDate(cell.key)}
                disabled={!cell.day}
                className={`relative flex flex-col items-center rounded-lg p-1.5 text-sm transition ${
                  cell.day
                    ? "hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "cursor-default"
                } ${isSelected ? "bg-slate-200 dark:bg-slate-700" : ""}`}
                style={
                  isSelected
                    ? {
                        background: "var(--accent-soft, rgba(14,165,233,0.16))",
                      }
                    : undefined
                }
              >
                {cell.day && (
                  <>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium ${
                        isToday
                          ? "text-white"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                      style={
                        isToday
                          ? { background: "var(--accent-spot, #0ea5e9)" }
                          : undefined
                      }
                    >
                      {cell.day}
                    </span>
                    {/* Event dots */}
                    <div className="mt-1 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: e.color }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events sidebar */}
      <div className="flex w-full flex-col border-t border-slate-200/70 dark:border-slate-800 md:w-64 md:border-l md:border-t-0">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-400">
              {selectedDate === todayKey ? t("calendar.today") : selectedDate}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowAddForm((s) => !s)}
          >
            {showAddForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Add event form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-200/70 dark:border-slate-800"
            >
              <div className="space-y-2 p-3">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t("calendar.addEvent")}
                  className="h-8 rounded-lg text-xs"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="h-8 w-28 rounded-lg text-xs"
                  />
                  <div className="flex gap-1">
                    {EVENT_COLORS.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewColor(idx)}
                        className="h-5 w-5 rounded-full transition"
                        style={{
                          background: c,
                          outline:
                            newColor === idx ? "2px solid white" : "none",
                          outlineOffset: newColor === idx ? "1px" : "0",
                          boxShadow:
                            newColor === idx ? "0 0 0 1px " + c : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={addEvent}
                  disabled={!newTitle.trim()}
                  size="sm"
                  className="h-8 w-full rounded-lg text-xs"
                  style={{
                    background: "var(--accent-spot, #0ea5e9)",
                    color: "white",
                  }}
                >
                  {t("calendar.addEvent")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Events list */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {eventsForSelected.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                <CalendarIcon className="h-8 w-8 opacity-40" />
                <p className="text-xs">{t("calendar.noEvents")}</p>
              </div>
            ) : (
              eventsForSelected.map((e) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="group flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/80 p-2.5 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: e.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
                      {e.title}
                    </p>
                    <p
                      className="text-[11px] text-slate-400"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {e.time}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
