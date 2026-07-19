// 生成唯一 ID（轻量、足够本地用）
export function genId(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}_${time}${rand}` : `${time}${rand}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}
