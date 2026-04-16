import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EnvironmentKind = "production" | "staging" | "development" | "test" | "custom";

const clientEnv = import.meta.env as Record<string, string | boolean | undefined>;

function resolveEnvironment() {
  const raw = String(clientEnv.VITE_APP_ENV ?? import.meta.env.MODE ?? "unknown")
    .trim()
    .toLowerCase();

  if (raw === "production" || raw === "prod") {
    return { kind: "production" as EnvironmentKind, label: "PRODUCTION", value: raw };
  }

  if (raw === "staging" || raw === "stage") {
    return { kind: "staging" as EnvironmentKind, label: "STAGING", value: raw };
  }

  if (raw === "development" || raw === "dev") {
    return { kind: "development" as EnvironmentKind, label: "DEVELOPMENT", value: raw };
  }

  if (raw === "test") {
    return { kind: "test" as EnvironmentKind, label: "TEST", value: raw };
  }

  return {
    kind: "custom" as EnvironmentKind,
    label: raw ? raw.toUpperCase() : "UNKNOWN",
    value: raw,
  };
}

const envStyles: Record<EnvironmentKind, string> = {
  production:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  staging:
    "border-amber-500/45 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  development:
    "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  test: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  custom: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

export function EnvironmentIndicator() {
  const env = resolveEnvironment();

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md px-2.5 font-semibold tracking-wide",
        envStyles[env.kind],
      )}
      title={`Current environment: ${env.label}`}
      aria-label={`Current environment: ${env.label}`}
    >
      ENV: {env.label}
    </Badge>
  );
}
