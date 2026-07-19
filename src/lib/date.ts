import {
  format,
  isToday,
  isTomorrow,
  isPast,
  isThisWeek,
  differenceInCalendarDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "yyyy-MM-dd");
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "yyyy-MM-dd HH:mm");
  } catch {
    return iso;
  }
}

export function fmtRelative(iso?: string): string {
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    if (isToday(d)) return `今天 ${format(d, "HH:mm")}`;
    if (isTomorrow(d)) return `明天 ${format(d, "HH:mm")}`;
    const diff = differenceInCalendarDays(d, new Date());
    if (diff > 0 && diff < 7) return `${diff} 天后`;
    if (diff < 0 && diff > -7) return `${Math.abs(diff)} 天前`;
    return format(d, "MM-dd");
  } catch {
    return iso;
  }
}

export function isOverdue(iso?: string): boolean {
  if (!iso) return false;
  try {
    return isPast(parseISO(iso)) && !isToday(parseISO(iso));
  } catch {
    return false;
  }
}

export function isDueToday(iso?: string): boolean {
  if (!iso) return false;
  try {
    return isToday(parseISO(iso));
  } catch {
    return false;
  }
}

export function isDueTomorrow(iso?: string): boolean {
  if (!iso) return false;
  try {
    return isTomorrow(parseISO(iso));
  } catch {
    return false;
  }
}

export function isThisWeekISO(iso?: string): boolean {
  if (!iso) return false;
  try {
    return isThisWeek(parseISO(iso), { weekStartsOn: 1 });
  } catch {
    return false;
  }
}

export function isThisMonthISO(iso?: string): boolean {
  if (!iso) return false;
  try {
    return isSameMonth(parseISO(iso), new Date());
  } catch {
    return false;
  }
}

export function weekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export function weekEnd(): Date {
  return endOfWeek(new Date(), { weekStartsOn: 1 });
}

export function monthStart(): Date {
  return startOfMonth(new Date());
}

export function monthEnd(): Date {
  return endOfMonth(new Date());
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  try {
    return differenceInCalendarDays(parseISO(iso), new Date());
  } catch {
    return null;
  }
}

export function fmtMonthDay(iso?: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MM月dd日");
  } catch {
    return iso;
  }
}

export function fmtFullDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "yyyy年MM月dd日", { locale: zhCN });
  } catch {
    return iso;
  }
}

export function toLocalInputValue(iso?: string): string {
  // datetime-local input value format: yyyy-MM-ddTHH:mm
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

export function fromDateInputValue(value: string): string {
  // value: yyyy-MM-dd or yyyy-MM-ddTHH:mm -> ISO
  if (!value) return "";
  const d = new Date(value);
  return d.toISOString();
}
