import { useEffect, useMemo, useState } from "react";
import AlertBanner from "@/components/dashboard/AlertBanner";
import MapHeat from "@/components/dashboard/MapHeat";
import RumorWatch from "@/components/dashboard/RumorWatch";
import TimelineChart from "@/components/dashboard/TimelineChart";
import FactCheckCard from "@/components/dashboard/FactCheckCard";
import { Button } from "@/components/ui/button";
import { useRealtimeOrSimulatedStream } from "@/lib/realtimeStream";
import { ProcessedPost } from "@/types/Post";

const Index = () => {
  const { hotspots, misinfo, timeline, selangorSignal, start, stop, running, denguePosts } = useRealtimeOrSimulatedStream();
  const [selected, setSelected] = useState<ProcessedPost | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // auto-start after load for demo wow-factor
    if (!running) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = useMemo(
    () => "Soph – Malaysia’s AI Public Health Sentinel",
    []
  );

  const sub = useMemo(
    () => "Real-time outbreak signals and misinformation shield for national response",
    []
  );

  const onSelectRumor = (p: ProcessedPost) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <main className="container py-6 space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold">{headline}</h1>
        <p className="text-muted-foreground">{sub}</p>
        <div className="bg-hero rounded-xl p-4 text-primary-foreground shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <AlertBanner level={selangorSignal.level} />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={running ? stop : start}>
                {running ? "Pause Stream" : "Start Stream"}
              </Button>
              <Button variant="hero">Share Situation Report</Button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 animate-enter">
          <MapHeat hotspots={hotspots} />
        </div>
        <div className="lg:col-span-1 animate-enter">
          <RumorWatch misinfo={misinfo} onSelect={onSelectRumor} />
        </div>
      </section>

      <section className="animate-enter">
        <TimelineChart data={timeline} />
        <p className="text-xs text-muted-foreground mt-2">Streaming posts processed: {denguePosts.length}</p>
      </section>

      <FactCheckCard post={selected} open={open} onOpenChange={setOpen} />
    </main>
  );
};

export default Index;
