import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Hotspot, ProcessedPost, RawPost } from "@/types/Post";
import { processPost } from "@/lib/nlp";

export function useDataStream() {
  const [all, setAll] = useState<ProcessedPost[]>([]);
  const [queue, setQueue] = useState<RawPost[]>([]);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    fetch("/data/posts.json")
      .then((r) => r.json())
      .then((data: RawPost[]) => {
        const sorted = data.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
        setQueue(sorted);
      })
      .catch((e) => console.error("Failed to load simulated posts", e));
  }, []);

  const pushNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setAll((cur) => [...cur, processPost(next)]);
      return rest;
    });
  }, []);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
  }, [running]);

  const stop = useCallback(() => {
    setRunning(false);
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    if (timer.current) window.clearTimeout(timer.current);
    const delay = 3000 + Math.random() * 2000; // 3–5s
    timer.current = window.setTimeout(() => {
      pushNext();
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [all, running, pushNext]);

  const denguePosts = useMemo(() => all.filter((p) => p.diseases.includes("dengue")), [all]);

  const hotspots: Hotspot[] = useMemo(() => {
    const map = new Map<string, Hotspot>();
    const weight = (p: ProcessedPost) => (p.category === "confirmed" ? 3 : p.category === "misinformation" ? 1.5 : 1);
    for (const p of denguePosts) {
      const key = p.location.name ?? `${p.location.lat.toFixed(2)},${p.location.lng.toFixed(2)}`;
      const current = map.get(key);
      const intensity = weight(p) + (current?.intensity ?? 0);
      const entry: Hotspot = {
        key,
        location: p.location,
        intensity,
        posts: [...(current?.posts ?? []), p],
      };
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.intensity - a.intensity);
  }, [denguePosts]);

  const misinfo = useMemo(() => denguePosts.filter((p) => p.category === "misinformation").slice(-50).reverse(), [denguePosts]);

  const timeline = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of denguePosts) {
      const k = format(new Date(p.timestamp), "HH:mm");
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => (a.time < b.time ? -1 : 1));
  }, [denguePosts]);

  const selangorSignal = useMemo(() => {
    const SELANGOR_KEYS = [/selangor/i, /shah alam/i, /petaling jaya/i, /klang/i, /gombak/i];
    const strength = hotspots
      .filter((h) => SELANGOR_KEYS.some((r) => r.test(h.location.name ?? "")))
      .reduce((acc, h) => acc + h.intensity, 0);
    let level: "safe" | "watch" | "warning" | "critical" = "safe";
    if (strength > 8) level = "watch";
    if (strength > 16) level = "warning";
    if (strength > 24) level = "critical";
    return { strength, level };
  }, [hotspots]);

  return { posts: all, denguePosts, hotspots, misinfo, timeline, selangorSignal, start, stop, running };
}
