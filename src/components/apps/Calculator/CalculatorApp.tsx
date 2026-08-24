"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Delete, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Button } from "@/components/ui/button";

interface CalculatorAppProps {
  userId: string;
}

interface HistoryEntry {
  expression: string;
  result: string;
  time: string;
}

type Operator = "+" | "-" | "*" | "/" | null;
type BtnVariant = "default" | "accent" | "operator" | "function";

function formatNumber(n: number): string {
  if (!isFinite(n)) return "Error";
  if (Math.abs(n) < 1e-10) return "0";
  const rounded = Math.round(n * 1e10) / 1e10;
  if (Math.abs(rounded) > 1e15) return rounded.toExponential(6);
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function compute(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function CalcButton({
  label,
  onClick,
  variant = "default",
}: {
  label: React.ReactNode;
  onClick: () => void;
  variant?: BtnVariant;
}) {
  const className =
    variant === "accent"
      ? "flex h-14 items-center justify-center rounded-xl text-xl font-semibold text-white shadow-sm"
      : variant === "operator"
        ? "flex h-14 items-center justify-center rounded-xl bg-slate-200/80 text-xl font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300/80 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600/80"
        : variant === "function"
          ? "flex h-14 items-center justify-center rounded-xl bg-slate-100/80 text-lg font-semibold text-slate-600 transition hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/80"
          : "flex h-14 items-center justify-center rounded-xl bg-white text-xl font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800/80";
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={className}
      style={
        variant === "accent"
          ? { background: "var(--accent-spot, #0ea5e9)" }
          : undefined
      }
    >
      {label}
    </motion.button>
  );
}

export function CalculatorApp({ userId }: CalculatorAppProps) {
  const { t, locale } = useI18n();
  const [display, setDisplay] = useState("0");
  const [previous, setPrevious] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const addHistory = useCallback(
    (expr: string, result: number) => {
      if (!isFinite(result)) return;
      setHistory((prev) =>
        [
          {
            expression: expr,
            result: formatNumber(result),
            time: new Date().toLocaleTimeString(
              locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
              { hour: "2-digit", minute: "2-digit" },
            ),
          },
          ...prev,
        ].slice(0, 50),
      );
    },
    [locale],
  );

  const inputDigit = useCallback(
    (digit: string) => {
      if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === "0" ? digit : display + digit);
      }
    },
    [display, waitingForOperand],
  );

  const inputDot = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPrevious(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const toggleSign = useCallback(() => {
    if (display !== "0") {
      setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
    }
  }, [display]);

  const percent = useCallback(() => {
    const val = parseFloat(display) / 100;
    setDisplay(formatNumber(val));
  }, [display]);

  const performOperator = useCallback(
    (nextOp: Operator) => {
      const inputValue = parseFloat(display);
      if (previous === null) {
        setPrevious(inputValue);
      } else if (operator && !waitingForOperand) {
        const result = compute(previous, inputValue, operator);
        const expr =
          formatNumber(previous) +
          " " +
          operator +
          " " +
          formatNumber(inputValue);
        setDisplay(formatNumber(result));
        setPrevious(result);
        addHistory(expr, result);
      }
      setWaitingForOperand(true);
      setOperator(nextOp);
    },
    [display, previous, operator, waitingForOperand, addHistory],
  );

  const equals = useCallback(() => {
    if (operator !== null && previous !== null) {
      const inputValue = parseFloat(display);
      const result = compute(previous, inputValue, operator);
      const expr =
        formatNumber(previous) +
        " " +
        operator +
        " " +
        formatNumber(inputValue);
      setDisplay(formatNumber(result));
      addHistory(expr, result);
      setPrevious(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, previous, operator, addHistory]);

  const backspace = useCallback(() => {
    if (!waitingForOperand) {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay("0");
      }
    }
  }, [display, waitingForOperand]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k >= "0" && k <= "9") inputDigit(k);
    else if (k === ".") inputDot();
    else if (k === "+") performOperator("+");
    else if (k === "-") performOperator("-");
    else if (k === "*") performOperator("*");
    else if (k === "/") {
      e.preventDefault();
      performOperator("/");
    } else if (k === "Enter" || k === "=") {
      e.preventDefault();
      equals();
    } else if (k === "Backspace") backspace();
    else if (k === "Escape") clear();
    else if (k === "%") percent();
  };

  void userId;

  return (
    <div
      className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-2.5 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("calc.title")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowHistory((s) => !s)}
        >
          <History className="h-4 w-4" />
        </Button>
      </div>

      {/* Display */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-slate-900/90 px-4 py-5 text-right shadow-inner dark:bg-black/60">
          <div
            className="truncate text-4xl font-light text-white"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {display}
          </div>
          {operator && previous !== null && (
            <div className="mt-1 text-xs text-slate-400">
              {formatNumber(previous)} {operator}
            </div>
          )}
        </div>
      </div>

      {/* Keypad */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="AC" variant="function" onClick={clear} />
          <CalcButton label="+/-" variant="function" onClick={toggleSign} />
          <CalcButton label="%" variant="function" onClick={percent} />
          <CalcButton
            label="/"
            variant="operator"
            onClick={() => performOperator("/")}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="7" onClick={() => inputDigit("7")} />
          <CalcButton label="8" onClick={() => inputDigit("8")} />
          <CalcButton label="9" onClick={() => inputDigit("9")} />
          <CalcButton
            label="*"
            variant="operator"
            onClick={() => performOperator("*")}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="4" onClick={() => inputDigit("4")} />
          <CalcButton label="5" onClick={() => inputDigit("5")} />
          <CalcButton label="6" onClick={() => inputDigit("6")} />
          <CalcButton
            label="-"
            variant="operator"
            onClick={() => performOperator("-")}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="1" onClick={() => inputDigit("1")} />
          <CalcButton label="2" onClick={() => inputDigit("2")} />
          <CalcButton label="3" onClick={() => inputDigit("3")} />
          <CalcButton
            label="+"
            variant="operator"
            onClick={() => performOperator("+")}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="0" onClick={() => inputDigit("0")} />
          <CalcButton label="." onClick={inputDot} />
          <CalcButton
            label={<Delete className="h-5 w-5" />}
            onClick={backspace}
          />
          <CalcButton label="=" variant="accent" onClick={equals} />
        </div>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200/70 dark:border-slate-800"
          >
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-medium text-slate-500">
                {t("calc.history")}
              </span>
              <button
                onClick={() => setHistory([])}
                className="text-[11px] text-slate-400 hover:text-rose-500"
              >
                {t("calc.clearHistory")}
              </button>
            </div>
            <ScrollArea className="max-h-40">
              <div className="space-y-1 px-4 pb-3">
                {history.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    {t("calc.empty")}
                  </p>
                ) : (
                  history.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-100/50 px-3 py-1.5 text-xs dark:bg-slate-800/50"
                    >
                      <span className="text-slate-500">
                        {h.expression} ={" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {h.result}
                        </span>
                      </span>
                      <span className="text-slate-400">{h.time}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
