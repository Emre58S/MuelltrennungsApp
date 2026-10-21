// Datei: utils/perf-marks.ts
// NUR ENTWICKLUNG: merkt sich, was zwischen zwei Bildern passiert ist (mit
// Dauer). Die Messung in der 3D-Szene (PerfProbe) schreibt bei einem Hänger
// eine [hänger]-Zeile ins Metro-Log – mit genau diesen Einträgen als Ursache.

const marks: string[] = [];

/** Ereignis vormerken, optional mit Dauer in ms. */
export function perfMark(tag: string, ms?: number) {
  if (!__DEV__ || marks.length >= 24) return;
  marks.push(ms === undefined ? tag : `${tag} ${Math.round(ms)}ms`);
}

/** Dauer einer Funktion messen und vormerken. */
export function perfTime<T>(tag: string, fn: () => T): T {
  if (!__DEV__) return fn();
  const start = performance.now();
  const result = fn();
  perfMark(tag, performance.now() - start);
  return result;
}

/** Alle seit dem letzten Bild vorgemerkten Ereignisse (und leeren). */
export function takePerfMarks(): string[] {
  const taken = marks.slice();
  marks.length = 0;
  return taken;
}
