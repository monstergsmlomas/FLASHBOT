"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  format, addMonths, subMonths, getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  date: string;
  status: string;
  customer?: { name?: string; phone?: string };
  durationMin?: number;
}

interface Props {
  appointments: Appointment[];
  onDayClick?: (date: Date, appointments: Appointment[]) => void;
}

const STATUS_COLOR = {
  CONFIRMED: {
    dot:      "bg-emerald-400",
    badge:    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    gradient: "linear-gradient(145deg, oklch(0.18 0.06 155) 0%, oklch(0.12 0.03 145) 100%)",
    gradientHover: "linear-gradient(145deg, oklch(0.22 0.07 155) 0%, oklch(0.15 0.04 145) 100%)",
    label:    "Confirmado",
  },
  PENDING: {
    dot:      "bg-amber-400",
    badge:    "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    gradient: "linear-gradient(145deg, oklch(0.19 0.07 75) 0%, oklch(0.12 0.04 65) 100%)",
    gradientHover: "linear-gradient(145deg, oklch(0.23 0.08 75) 0%, oklch(0.15 0.05 65) 100%)",
    label:    "Pendiente",
  },
  CANCELLED: {
    dot:      "bg-rose-400",
    badge:    "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    gradient: "linear-gradient(145deg, oklch(0.18 0.06 15) 0%, oklch(0.12 0.03 10) 100%)",
    gradientHover: "linear-gradient(145deg, oklch(0.22 0.07 15) 0%, oklch(0.15 0.04 10) 100%)",
    label:    "Cancelado",
  },
  COMPLETED: {
    dot:      "bg-slate-400",
    badge:    "bg-slate-500/20 text-slate-400 border border-slate-500/30",
    gradient: "linear-gradient(145deg, oklch(0.18 0.02 250) 0%, oklch(0.12 0.01 240) 100%)",
    gradientHover: "linear-gradient(145deg, oklch(0.22 0.02 250) 0%, oklch(0.15 0.01 240) 100%)",
    label:    "Completado",
  },
} as const;

// Gradiente base para celdas vacías (igual al estilo de las cards del screenshot)
const BASE_GRADIENT = "linear-gradient(145deg, oklch(0.16 0.03 260) 0%, oklch(0.11 0.02 245) 100%)";
const BASE_GRADIENT_HOVER = "linear-gradient(145deg, oklch(0.20 0.04 260) 0%, oklch(0.14 0.02 245) 100%)";
const BASE_GRADIENT_WEEKEND = "linear-gradient(145deg, oklch(0.15 0.03 10) 0%, oklch(0.10 0.02 350) 100%)";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getDominantStatus(appts: Appointment[]): string | null {
  if (!appts.length) return null;
  const counts: Record<string, number> = {};
  appts.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function MonthCalendar({ appointments, onDayClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(currentMonth),   { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const key = format(new Date(a.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [appointments]);

  const getApptForDay = (day: Date) =>
    appointmentsByDay.get(format(day, "yyyy-MM-dd")) ?? [];

  const totalInMonth = useMemo(
    () => calendarDays
      .filter((d) => isSameMonth(d, currentMonth))
      .reduce((n, d) => n + getApptForDay(d).length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendarDays, appointmentsByDay],
  );

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header con gradiente */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: "linear-gradient(135deg, oklch(0.22 0.08 255) 0%, oklch(0.18 0.06 200) 100%)" }}
      >
        <div>
          <h2 className="font-bold text-white capitalize text-base">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          {totalInMonth > 0 && (
            <p className="text-[11px] text-white/50 mt-0.5">
              {totalInMonth} turno{totalInMonth !== 1 ? "s" : ""} este mes
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors text-white/70 hover:text-white border border-white/20"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cabecera de días */}
      <div
        className="grid grid-cols-7 border-b border-border/30"
        style={{ background: "linear-gradient(180deg, oklch(0.14 0.03 255) 0%, oklch(0.12 0.02 250) 100%)" }}
      >
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-2 text-center text-[10px] font-bold uppercase tracking-wider",
              i >= 5 ? "text-rose-400/80" : "text-muted-foreground/70",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const appts     = getApptForDay(day);
          const inMonth   = isSameMonth(day, currentMonth);
          const todayDay  = isToday(day);
          const isHovered = hoveredDay ? isSameDay(day, hoveredDay) : false;
          const isWeekend = [6, 0].includes(getDay(day));
          const dominant  = getDominantStatus(appts);
          const colors    = dominant ? STATUS_COLOR[dominant as keyof typeof STATUS_COLOR] : null;

          const statusGroups = appts.reduce(
            (acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; },
            {} as Record<string, number>,
          );

          // Elegir el gradiente correcto según el estado
          const cellBg = !inMonth
            ? BASE_GRADIENT
            : isHovered
              ? (colors ? colors.gradientHover : isWeekend ? BASE_GRADIENT_WEEKEND : BASE_GRADIENT_HOVER)
              : colors
                ? colors.gradient
                : isWeekend
                  ? BASE_GRADIENT_WEEKEND
                  : BASE_GRADIENT;

          return (
            <div
              key={i}
              className={cn(
                "relative min-h-[78px] p-2 border-b border-r border-border/20 cursor-pointer transition-all duration-200 group",
                !inMonth && "opacity-25",
                i % 7 === 6 && "border-r-0",
              )}
              style={{ background: cellBg }}
              onMouseEnter={() => inMonth && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => inMonth && onDayClick?.(day, appts)}
            >
              {/* Barra lateral para días con muchos turnos */}
              {appts.length >= 3 && inMonth && colors && (
                <span className={cn("absolute left-0 top-2 bottom-2 w-0.5 rounded-full", colors.dot)} />
              )}

              {/* Número del día */}
              <span
                className={cn(
                  "inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  todayDay
                    ? "bg-primary text-white shadow shadow-primary/50 ring-2 ring-primary/30"
                    : isWeekend && inMonth
                      ? "text-rose-400/90"
                      : "text-foreground/80",
                )}
              >
                {format(day, "d")}
              </span>

              {/* Badges de estado */}
              {appts.length > 0 && inMonth && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {Object.entries(statusGroups).slice(0, 2).map(([status, count]) => {
                    const sc = STATUS_COLOR[status as keyof typeof STATUS_COLOR];
                    if (!sc) return null;
                    return (
                      <span
                        key={status}
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                          sc.badge,
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot)} />
                        {count} {sc.label.toLowerCase()}{count !== 1 ? "s" : ""}
                      </span>
                    );
                  })}
                  {appts.length > 2 && Object.keys(statusGroups).length > 2 && (
                    <span className="text-[9px] text-muted-foreground px-1.5">…</span>
                  )}
                </div>
              )}

              {/* Tooltip */}
              {isHovered && appts.length > 0 && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-2xl p-3 pointer-events-none">
                  <p className="text-[11px] font-bold text-foreground mb-2 capitalize">
                    {format(day, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <div className="space-y-1.5">
                    {appts.slice(0, 5).map((a) => {
                      const sc = STATUS_COLOR[a.status as keyof typeof STATUS_COLOR];
                      return (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", sc?.dot ?? "bg-muted")} />
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {format(new Date(a.date), "HH:mm")}
                          </span>
                          <span className="text-foreground truncate text-[11px]">
                            {a.customer?.name || a.customer?.phone || "Sin nombre"}
                          </span>
                        </div>
                      );
                    })}
                    {appts.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+{appts.length - 5} más</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div
        className="flex items-center gap-4 px-5 py-3 border-t border-border/20 flex-wrap"
        style={{ background: "linear-gradient(180deg, oklch(0.12 0.02 250) 0%, oklch(0.11 0.015 245) 100%)" }}
      >
        {Object.values(STATUS_COLOR).map((sc) => (
          <div key={sc.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("w-2 h-2 rounded-full", sc.dot)} />
            {sc.label}
          </div>
        ))}
      </div>
    </div>
  );
}
