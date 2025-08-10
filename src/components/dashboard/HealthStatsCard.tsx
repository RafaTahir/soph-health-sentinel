import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthStats } from "@/hooks/useFakeHealthStats";

interface HealthStatsCardProps {
  stats: HealthStats;
  title?: string;
  className?: string;
}

export default function HealthStatsCard({ stats, title = "Live Health Metrics", className }: HealthStatsCardProps) {
  const nf = new Intl.NumberFormat();

  const Item = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}{unit ? ` ${unit}` : ""}</span>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Item label="Active Patients" value={nf.format(stats.activePatients)} />
          <Item label="Heart Rate" value={stats.heartRate} unit="bpm" />
          <Item label="Oxygen Saturation" value={stats.oxygenSaturation} unit="%" />
          <Item label="Hospital Visits Today" value={nf.format(stats.hospitalVisits)} />
          <Item label="Pending Alerts" value={nf.format(stats.pendingAlerts)} />
          <Item label="Avg Wait Time" value={stats.avgWaitTime} unit="min" />
        </div>
      </CardContent>
    </Card>
  );
}
