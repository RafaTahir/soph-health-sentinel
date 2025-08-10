import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface AlertBannerProps {
  level: "safe" | "watch" | "warning" | "critical";
}

const messages: Record<AlertBannerProps["level"], string> = {
  safe: "Monitoring: No significant outbreak signals detected",
  watch: "Elevated chatter in Selangor – signal under watch",
  warning: "Possible Dengue Outbreak Detected in Selangor – ~48 hours ahead of reports",
  critical: "Critical Signal: Strong Dengue Outbreak Indicators in Selangor",
};

export default function AlertBanner({ level }: AlertBannerProps) {
  const isSafe = level === "safe";
  const Icon = isSafe ? CheckCircle2 : AlertTriangle;
  const cls = isSafe
    ? "bg-success text-success-foreground"
    : level === "watch"
    ? "bg-secondary text-secondary-foreground"
    : level === "warning"
    ? "bg-warning text-warning-foreground"
    : "bg-destructive text-destructive-foreground";

  return (
    <section className={`rounded-lg p-4 md:p-5 flex items-center gap-3 animate-enter ${cls}`} aria-live="polite">
      <Icon className="h-5 w-5" />
      <p className="text-sm md:text-base font-semibold">{messages[level]}</p>
    </section>
  );
}
