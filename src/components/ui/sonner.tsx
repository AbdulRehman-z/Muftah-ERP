import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4 text-emerald-500" />,
        info: <Info className="size-4 text-blue-500" />,
        warning: <AlertTriangle className="size-4 text-amber-500" />,
        error: <XCircle className="size-4 text-destructive" />,
        loading: <Loader2 className="size-4 text-muted-foreground animate-spin" />,
      }}
      toastOptions={{
        // Using unstyled strips Sonner's forced inline colors so Tailwind can actually do its job
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-md border border-border bg-background p-4 text-foreground shadow-lg transition-all",
          title: "text-sm font-semibold text-foreground",
          description: "text-sm text-muted-foreground mt-1",
          actionButton:
            "inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton:
            "inline-flex items-center justify-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground",
          icon: "mt-0.5 shrink-0", // Ensures the icon stays aligned at the top if the text wraps to two lines
        },
      }}
      {...props}
    />
  );
};

export { Toaster };