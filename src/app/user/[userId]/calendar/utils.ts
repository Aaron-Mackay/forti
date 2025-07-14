export const minToHhMm = (timeInMinutes: number): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(timeInMinutes / 60);
  const m = timeInMinutes % 60;
  return `${pad(h)}:${pad(m)}`;
}
export const hhMmToMin = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}