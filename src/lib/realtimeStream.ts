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
  // Live seeding controls (for demo data via Supabase Realtime)
  const seederTimer = useRef<number | null>(null);
  const seeding = useRef(false);
  const seedIdx = useRef(0);

  // Pool of plausible live posts around Selangor/Klang Valley
  const SEED_POOL: Array<Omit<RawPost, "id">> = [
    { timestamp: new Date().toISOString(), text: "Hearing about fever cases in Puchong — anyone else?", location: { lat: 3.015, lng: 101.621 }, type: "general", user: "@puchongwatch" },
    { timestamp: new Date().toISOString(), text: "BREAKING: 5 confirmed dengue cases in Petaling Jaya hospital.", location: { lat: 3.107, lng: 101.64 }, type: "confirmed", user: "@healthnews_my" },
    { timestamp: new Date().toISOString(), text: "Drinking papaya leaf juice prevents dengue — share!", location: { lat: 3.073, lng: 101.518 }, type: "misinformation", user: "@viralhealth" },
    { timestamp: new Date().toISOString(), text: "Local school closed after suspected dengue in Subang Jaya.", location: { lat: 3.072, lng: 101.585 }, type: "confirmed", user: "@subangcommunity" },
    { timestamp: new Date().toISOString(), text: "My neighbor got dengue — stay safe, Shah Alam!", location: { lat: 3.073, lng: 101.518 }, type: "general", user: "@shahalamresident" },
    { timestamp: new Date().toISOString(), text: "High mosquito density reported near Klang river", location: { lat: 3.038, lng: 101.449 }, type: "general", user: "@klangupdate" },
    { timestamp: new Date().toISOString(), text: "Clinic confirms multiple dengue admissions in PJ", location: { lat: 3.107, lng: 101.64 }, type: "confirmed", user: "@pjclinic" },
    { timestamp: new Date().toISOString(), text: "Garlic water keeps dengue away – proven!", location: { lat: 3.215, lng: 101.575 }, type: "misinformation", user: "@miraclecures" },
    { timestamp: new Date().toISOString(), text: "Fogging scheduled tonight in Gombak", location: { lat: 3.238, lng: 101.689 }, type: "general", user: "@gombakcouncil" },
    { timestamp: new Date().toISOString(), text: "Hospital Shah Alam reports spike in dengue cases", location: { lat: 3.073, lng: 101.518 }, type: "confirmed", user: "@moh_updates" },
    { timestamp: new Date().toISOString(), text: "Heatwave means dengue can't spread – don't worry", location: { lat: 3.215, lng: 101.575 }, type: "misinformation", user: "@randomfacts" },
    { timestamp: new Date().toISOString(), text: "Neighbors coordinating cleanup of stagnant water in PJ", location: { lat: 3.107, lng: 101.64 }, type: "general", user: "@pjneighbors" },
  ];

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

  // Live demo seeding via Supabase Realtime
  const startSeeding = () => {
    if (seeding.current || !isSupabaseReady || !supabase) return;
    toast({ title: "Seeding live demo", description: "Streaming via Supabase Realtime." });
    seeding.current = true;
    seedIdx.current = 0;
    const insertNext = async () => {
      try {
        const base = SEED_POOL[seedIdx.current % SEED_POOL.length];
        seedIdx.current += 1;
        const row = {
          timestamp: new Date().toISOString(),
          text: base.text,
          location: base.location,
          type: base.type,
          user: base.user ?? null,
        } as any;
        const { error } = await supabase.from("posts").insert(row);
        if (error) throw error;
      } catch (e) {
        console.error("Seeding error", e);
        toast({ title: "Seeding failed", description: "Falling back to local simulator." });
        stopSeeding();
      }
    };
    // fire first insert immediately, then interval
    insertNext();
    seederTimer.current = window.setInterval(insertNext, 3000);
  };

  const stopSeeding = () => {
    if (seederTimer.current) {
      window.clearInterval(seederTimer.current);
      seederTimer.current = null;
    }
    seeding.current = false;
  };

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
    stopSeeding();
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

  // Auto-start live seeding when table is empty
  useEffect(() => {
    if (!running) return;
    if (!(isSupabaseReady && supabase)) return;
    if (seeding.current) return;
    // Check if table has any rows; if none, begin seeding
    supabase
      .from("posts")
      .select("id")
      .limit(1)
      .then(({ data, error }) => {
        if (!error && (!data || data.length === 0)) {
          startSeeding();
        }
      });
  }, [running, all.length]);

  // Cleanup seeder on unmount
  useEffect(() => {
    return () => {
      if (seeding.current) stopSeeding();
    };
  }, []);

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
