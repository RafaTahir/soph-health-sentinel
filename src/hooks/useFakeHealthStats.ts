import { useEffect, useMemo, useRef, useState } from "react";

export type HealthStats = {
  activePatients: number;
  heartRate: number;
  oxygenSaturation: number;
  hospitalVisits: number;
  pendingAlerts: number;
  avgWaitTime: number;
};

export type UseFakeHealthStatsOptions = {
  enabled?: boolean;
  durationMs?: number; // default 5 minutes
  minIntervalMs?: number; // default 2000
  maxIntervalMs?: number; // default 5000
  initial?: Partial<HealthStats>;
};

const DEFAULTS: HealthStats = {
  activePatients: 120,
  heartRate: 75,
  oxygenSaturation: 98,
  hospitalVisits: 12,
  pendingAlerts: 4,
  avgWaitTime: 30,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function useFakeHealthStats(options: UseFakeHealthStatsOptions = {}) {
  const {
    enabled = true,
    durationMs = 5 * 60 * 1000,
    minIntervalMs = 2000,
    maxIntervalMs = 5000,
    initial = {},
  } = options;

  const [stats, setStats] = useState<HealthStats>({ ...DEFAULTS, ...initial });
  const [running, setRunning] = useState<boolean>(false);
  const endTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const intervalRange = useMemo(() => [minIntervalMs, maxIntervalMs] as const, [minIntervalMs, maxIntervalMs]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setRunning(true);
    const endAt = Date.now() + durationMs;
    endTimeRef.current = endAt;

    const scheduleNext = () => {
      const [minI, maxI] = intervalRange;
      const nextUpdate = Math.floor(Math.random() * (maxI - minI) + minI);
      timerRef.current = window.setTimeout(tick, nextUpdate);
    };

    const tick = () => {
      if (cancelled) return;
      setStats((prev) => {
        const fluctuate = (
          base: number,
          minChange: number,
          maxChange: number,
          clampMin: number | null = 0,
          clampMax: number | null = null
        ) => {
          const change = base * (Math.random() * (maxChange - minChange) + minChange);
          const newValue = Math.random() > 0.5 ? base + change : base - change;
          const rounded = Math.round(newValue);
          if (clampMax != null && clampMin != null) return clamp(rounded, clampMin, clampMax);
          if (clampMin != null) return Math.max(clampMin, rounded);
          return rounded;
        };

        return {
          activePatients: fluctuate(prev.activePatients, 0.2, 0.5, 0, 5000),
          heartRate: fluctuate(prev.heartRate, 0.05, 0.15, 50, 120),
          oxygenSaturation: fluctuate(prev.oxygenSaturation, 0.01, 0.03, 90, 100),
          hospitalVisits: fluctuate(prev.hospitalVisits, 0.3, 0.6, 0, 200),
          pendingAlerts: fluctuate(prev.pendingAlerts, 0.4, 0.7, 0, 200),
          avgWaitTime: fluctuate(prev.avgWaitTime, 0.15, 0.4, 0, 240),
        };
      });

      if (Date.now() < endAt) {
        scheduleNext();
      } else {
        setRunning(false);
      }
    };

    // kick off immediately
    tick();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setRunning(false);
    };
  }, [enabled, durationMs, intervalRange]);

  return { stats, running };
}
