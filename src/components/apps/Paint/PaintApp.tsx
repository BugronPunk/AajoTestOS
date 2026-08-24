"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Brush,
  Eraser,
  Trash2,
  Download,
  Undo,
  Pen,
  Palette,
} from "lucide-react";

interface PaintAppProps {
  userId: string;
}

type Tool = "brush" | "eraser";

const COLORS = [
  "#0f172a",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#ffffff",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
];

const SIZES = [2, 5, 10, 20, 40];

export function PaintApp({ userId }: PaintAppProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#0f172a");
  const [size, setSize] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  void userId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    // Save initial state
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-20), imgData]);
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.PointerEvent) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    setDrawing(true);
    lastPoint.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    // Draw a dot for single click
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.PointerEvent) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = size;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    saveState();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    ctx.putImageData(prev, 0, 0);
    setHistory((h) => h.slice(0, -1));
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "aajostest-paint.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-3 py-2 dark:border-slate-800">
        {/* Tools */}
        <div className="flex gap-1">
          <ToolButton
            active={tool === "brush"}
            onClick={() => setTool("brush")}
            title={t("paint.brush")}
          >
            <Brush className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            active={tool === "eraser"}
            onClick={() => setTool("eraser")}
            title={t("paint.eraser")}
          >
            <Eraser className="h-4 w-4" />
          </ToolButton>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Colors */}
        <div className="flex flex-wrap gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("brush");
              }}
              className="h-6 w-6 rounded-full border-2 transition hover:scale-110"
              style={{
                background: c,
                borderColor:
                  color === c ? "var(--accent-spot, #0ea5e9)" : "transparent",
              }}
            />
          ))}
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Sizes */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                size === s
                  ? "bg-slate-200 dark:bg-slate-700"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              style={
                size === s
                  ? { background: "var(--accent-soft, rgba(14,165,233,0.16))" }
                  : undefined
              }
            >
              <span
                className="block rounded-full"
                style={{
                  width: Math.min(s, 16),
                  height: Math.min(s, 16),
                  background: tool === "eraser" ? "#cbd5e1" : color,
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-1">
          <ToolButton
            onClick={undo}
            title={t("paint.undo")}
            disabled={history.length < 2}
          >
            <Undo className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={clear} title={t("paint.clear")}>
            <Trash2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={download} title={t("paint.download")}>
            <Download className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        {/* Current tool indicator */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-md backdrop-blur dark:bg-slate-800/80 dark:text-slate-300">
          {tool === "brush" ? (
            <Brush className="h-3 w-3" />
          ) : (
            <Eraser className="h-3 w-3" />
          )}
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: tool === "eraser" ? "#ffffff" : color,
              border: "1px solid #cbd5e1",
            }}
          />
          <span>{size}px</span>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  active,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30 ${
        active
          ? "text-white"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
      style={active ? { background: "var(--accent-spot, #0ea5e9)" } : undefined}
    >
      {children}
    </motion.button>
  );
}
