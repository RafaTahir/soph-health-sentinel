import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Hotspot, ProcessedPost, RawPost } from "@/types/Post";
import { processPost } from "@/lib/nlp";
import { supabase, isSupabaseReady } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Unified realtime-first stream. If Supabase Realtime is unavailable,
// it falls back to the local simulator using /data/fake_posts.json.
export function useRealtimeOrSimulatedStream() {
  const { toast } = useToast();
  const [all, setAll] = useState<ProcessedPost[]>([]);
  const [queue, setQueue] = useState<RawPost[]>([]);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);
  const realtimeSub = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // Load initial data
  useEffect(() => {
    let didCancel = false;

    async function init() {
      if (isSupabaseReady && supabase) {
        try {
          // Backfill recent posts (last 200) ordered by timestamp
          const { data, error } = await supabase
            .from("posts")
            .select("id,timestamp,text,location,type,user")
            .order("timestamp", { ascending: true })
            .limit(200);
          if (error) throw error;
          if (!didCancel && data) {
            const mapped: RawPost[] = data.map((r: any) => ({
              id: String(r.id ?? crypto.randomUUID()),
              timestamp: r.timestamp,
              text: r.text,
              location: r.location ?? { lat: 0, lng: 0 },
              type: r.type,
              user: r.user ?? undefined,
            }));
            setAll(mapped.map(processPost));
          }
        } catch (e) {
          console.error("Supabase init error", e);
          if (!didCancel) {
            toast({
              title: "Realtime unavailable",
              description: "Falling back to local simulator.",
            });
          }
        }
      } else {
        // Fallback simulator dataset
        fetch("/data/fake_posts.json")
          .then((r) => r.json())
          .then((data: any[]) => {
            if (didCancel) return;
            const withIds: RawPost[] = data.map((d, i) => ({
              id: d.id ?? `${Date.now()}-${i}`,
              timestamp: d.timestamp,
              text: d.text,
              location: d.location,
              type: d.type,
              user: d.user,
            }));
            const sorted = withIds.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
            setQueue(sorted);
          })
          .catch((e) => console.error("Failed to load fallback dataset", e));
      }
    }

    init();
    return () => {
      didCancel = true;
    };
  }, [toast]);

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

    // Start realtime subscription if available
    if (isSupabaseReady && supabase) {
      const ch = supabase.channel("posts-changes");
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          const r = payload.new;
          const raw: RawPost = {
            id: String(r.id ?? crypto.randomUUID()),
            timestamp: r.timestamp,
            text: r.text,
            location: r.location ?? { lat: 0, lng: 0 },
            type: r.type,
            user: r.user ?? undefined,
          };
          setAll((cur) => [...cur, processPost(raw)]);
        }
      );
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          toast({ title: "Realtime connected", description: "Live outbreak stream active." });
        }
      });
      realtimeSub.current = ch;
    }
  }, [running, toast]);

  const stop = useCallback(() => {
    setRunning(false);
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (realtimeSub.current) {
      realtimeSub.current.unsubscribe();
      realtimeSub.current = null;
    }
  }, []);

  // Simulator timer only when not using realtime
  useEffect(() => {
    if (!running) return;
    if (isSupabaseReady && supabase) return; // realtime handles itself

    if (timer.current) window.clearTimeout(timer.current);
    const delay = 3000 + Math.random() * 2000;
    timer.current = window.setTimeout(() => {
      pushNext();
    }, delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [all, running, pushNext]);

  // Derived metrics (same as simulator)
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
