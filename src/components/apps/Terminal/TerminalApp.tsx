"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";

interface TerminalAppProps {
  userId: string;
  displayName: string;
}

interface Line {
  type: "input" | "output" | "system";
  text: string;
}

export function TerminalApp({ userId, displayName }: TerminalAppProps) {
  const { t, locale } = useI18n();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const prompt = t("terminal.prompt");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = (type: Line["type"], text: string) => {
    setLines((prev) => [...prev, { type, text }]);
  };

  const handleCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      addLine("input", prompt + " " + cmd);
      if (!cmd) return;

      setHistory((prev) => [...prev, cmd]);

      const parts = cmd.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      switch (command) {
        case "help":
          addLine("output", t("terminal.help"));
          break;
        case "clear":
          setLines([]);
          toast.success(t("terminal.cleared"));
          break;
        case "echo":
          addLine("output", args || "");
          break;
        case "date":
          addLine(
            "output",
            new Date().toLocaleString(
              locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
              { dateStyle: "full", timeStyle: "medium" },
            ),
          );
          break;
        case "whoami":
          addLine("output", displayName + " (uid=" + userId.slice(-8) + ")");
          break;
        case "ls":
          addLine(
            "output",
            "Desktop/  Documents/  Downloads/  Music/  Pictures/  Videos/  .aajostestrc",
          );
          break;
        case "about":
          addLine("output", "AajoTestOS v1.0 (Build 2024.08)");
          addLine("output", "A calm web operating system");
          addLine("output", "Kernel: AajoTest Virtual Core");
          addLine("output", "Shell: aajosh 1.0");
          break;
        case "neofetch":
          addLine("system", "");
          addLine("output", "         ___");
          addLine(
            "output",
            "        /   \\        " + displayName + "@aajostest",
          );
          addLine("output", "       |  A  |       -----------------");
          addLine("output", "        \\___/        OS: AajoTestOS 1.0");
          addLine("output", "                    Kernel: Virtual Core");
          addLine("output", "                    Shell: aajosh 1.0");
          addLine(
            "output",
            "                    Locale: " + locale.toUpperCase(),
          );
          addLine("output", "                    Terminal: aajoterm");
          break;
        case "calc": {
          try {
            const expr = args.replace(/[^-+*/().0-9\s]/g, "");
            if (expr) {
              const result = Function('"use strict";return (' + expr + ")")();
              addLine("output", "= " + result);
            } else {
              addLine("output", "Usage: calc <expression> (e.g. calc 2 + 2)");
            }
          } catch {
            addLine("output", "Invalid expression");
          }
          break;
        }
        case "joke":
          {
            const jokes = [
              "Why do programmers prefer dark mode? Because light attracts bugs.",
              "There are only 10 types of people: those who understand binary and those who do not.",
              "A SQL query walks into a bar, approaches two tables, and asks: May I join you?",
              "Why did the developer go broke? Because he used up all his cache.",
              "How many programmers does it take to change a light bulb? None. It is a hardware problem.",
            ];
            addLine("output", jokes[Math.floor(Math.random() * jokes.length)]);
          }
          break;
        case "exit":
          toast.info("Terminal session preserved");
          break;
        default:
          addLine("output", t("terminal.unknown") + " (" + command + ")");
      }
    },
    [prompt, t, displayName, userId, locale, toast],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex =
          historyIndex === -1
            ? history.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  return (
    <div
      className="flex h-full flex-col bg-slate-950/90 font-mono text-[13px] leading-relaxed"
      onClick={() => inputRef.current?.focus()}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 text-slate-200"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="text-emerald-400/80">{t("terminal.welcome")}</div>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={
              line.type === "input"
                ? "text-slate-300"
                : line.type === "system"
                  ? "text-emerald-400/80"
                  : "text-slate-400"
            }
          >
            {line.text || "\u00a0"}
          </div>
        ))}
        {/* Active prompt line */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <span style={{ color: "var(--accent-spot, #0ea5e9)" }}>{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent text-slate-100 outline-none caret-emerald-400"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
