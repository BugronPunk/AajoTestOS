"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { motion } from "framer-motion";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Activity,
  Clock,
  Zap,
  Thermometer,
} from "lucide-react";

interface MonitorAppProps {
  userId: string;
}

interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
}

const PROCESS_NAMES = [
  "aajoterm",
  "window-manager",
  "socket-service",
  "notes-engine",
  "chat-rt",
  "i18n-service",
  "render-pipeline",
  "dock-daemon",
  "files-index",
  "auth-gateway",
  "wallpaper-engine",
  "spotlight-svc",
  "calendar-sync",
  "music-player",
  "clock-tick",
  "weather-fetch",
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function SmoothLine({
  data,
  color,
  max,
  label,
  value,
  unit,
  icon,
}: {
  data: number[];
  color: string;
  max: number;
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
}) {
  const width = 200;
  const height = 50;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: color + "20" }}
          >
            {icon}
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-lg font-semibold tabular-nums"
            style={{ color }}
          >
            {value}
          </span>
          <span className="text-[10px] text-slate-400">{unit}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 50 }}
      >
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#grad-${label})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function generateProcessList(): Process[] {
  return Array.from({ length: 8 })
    .map((_, i) => ({
      pid: 1000 + i * 137,
      name: PROCESS_NAMES[Math.floor(Math.random() * PROCESS_NAMES.length)],
      cpu: Math.round(randomBetween(0.1, 12) * 10) / 10,
      memory: Math.round(randomBetween(5, 120)),
    }))
    .sort((a, b) => b.cpu - a.cpu);
}

export function MonitorApp({ userId }: MonitorAppProps) {
  const { t } = useI18n();
  const [cpuHistory, setCpuHistory] = useState<number[]>(
    Array.from({ length: 30 }, () => randomBetween(5, 20)),
  );
  const [memHistory, setMemHistory] = useState<number[]>(
    Array.from({ length: 30 }, () => randomBetween(30, 45)),
  );
  const [netHistory, setNetHistory] = useState<number[]>(
    Array.from({ length: 30 }, () => randomBetween(0.5, 2)),
  );
  const [storageHistory, setStorageHistory] = useState<number[]>(
    Array.from({ length: 30 }, () => 58 + randomBetween(-0.5, 0.5)),
  );
  // Computed once at mount via a lazy initialiser instead of an effect.
  const [processes, setProcesses] = useState<Process[]>(generateProcessList);
  const [uptime, setUptime] = useState(0);
  const [temp, setTemp] = useState(42);
  const startTime = useRef(Date.now());

  void userId;

  useEffect(() => {
    const id = setInterval(() => {
      setCpuHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(2, Math.min(95, last + randomBetween(-8, 8)));
        return [...prev.slice(1), next];
      });
      setMemHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(15, Math.min(90, last + randomBetween(-3, 3)));
        return [...prev.slice(1), next];
      });
      setNetHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(0, Math.min(20, last + randomBetween(-2, 2)));
        return [...prev.slice(1), next];
      });
      setStorageHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(
          40,
          Math.min(80, last + randomBetween(-0.1, 0.1)),
        );
        return [...prev.slice(1), next];
      });
      setTemp((prev) =>
        Math.max(35, Math.min(75, prev + randomBetween(-1, 1))),
      );
      setProcesses(generateProcessList());
      setUptime(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const cpuNow = cpuHistory[cpuHistory.length - 1];
  const memNow = memHistory[memHistory.length - 1];
  const netNow = netHistory[netHistory.length - 1];
  const storageNow = storageHistory[storageHistory.length - 1];

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="h-full overflow-y-auto bg-white/70 dark:bg-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("monitor.title")}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatUptime(uptime)}
          </span>
          <span className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            {Math.round(temp)}°C
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <SmoothLine
          data={cpuHistory}
          color="#0ea5e9"
          max={100}
          label={t("monitor.cpu")}
          value={cpuNow.toFixed(1)}
          unit="%"
          icon={<Cpu className="h-4 w-4" style={{ color: "#0ea5e9" }} />}
        />
        <SmoothLine
          data={memHistory}
          color="#10b981"
          max={100}
          label={t("monitor.memory")}
          value={memNow.toFixed(1)}
          unit="%"
          icon={
            <MemoryStick className="h-4 w-4" style={{ color: "#10b981" }} />
          }
        />
        <SmoothLine
          data={netHistory}
          color="#f59e0b"
          max={20}
          label={t("monitor.network")}
          value={netNow.toFixed(1)}
          unit="MB/s"
          icon={<Wifi className="h-4 w-4" style={{ color: "#f59e0b" }} />}
        />
        <SmoothLine
          data={storageHistory}
          color="#8b5cf6"
          max={100}
          label={t("monitor.storage")}
          value={storageNow.toFixed(1)}
          unit="%"
          icon={<HardDrive className="h-4 w-4" style={{ color: "#8b5cf6" }} />}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <StatPill
          icon={<Zap className="h-3 w-3" />}
          label={t("monitor.ghz")}
          value="3.2"
        />
        <StatPill
          icon={<MemoryStick className="h-3 w-3" />}
          label="RAM"
          value="16 GB"
        />
        <StatPill
          icon={<HardDrive className="h-3 w-3" />}
          label="SSD"
          value="512 GB"
        />
      </div>

      {/* Process table */}
      <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("monitor.processes")}
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200/70 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 font-medium text-slate-500">PID</th>
                <th className="px-3 py-2 font-medium text-slate-500">Name</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  {t("monitor.cpu")}
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  {t("monitor.memory")}
                </th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p, idx) => (
                <motion.tr
                  key={`${p.pid}-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-3 py-1.5 tabular-nums text-slate-400">
                    {p.pid}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-200">
                    {p.name}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right tabular-nums"
                    style={{ color: p.cpu > 5 ? "#ef4444" : "#0ea5e9" }}
                  >
                    {p.cpu.toFixed(1)}%
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                    {p.memory} MB
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
      <span className="text-slate-400">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
          {value}
        </span>
      </div>
    </div>
  );
}
