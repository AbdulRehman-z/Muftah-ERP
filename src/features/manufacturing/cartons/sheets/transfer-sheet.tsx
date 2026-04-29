import { useState, useEffect } from "react";
import { ArrowRightLeft, Package, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTransferPacks, useCartonDetail } from "../hooks/use-carton-mutations";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  sourceCartonId: string;
  sourceSku: string | null;
  sourcePacks: number;
};

export function TransferSheet({
  open,
  onOpenChange,
  batchId,
  sourceCartonId,
  sourceSku,
  sourcePacks,
}: Props) {
  const [destinationCartonId, setDestinationCartonId] = useState("");
  const [debouncedId, setDebouncedId] = useState("");
  const [packCount, setPackCount] = useState(1);
  const mutation = useTransferPacks(batchId);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedId(destinationCartonId.trim()), 400);
    return () => clearTimeout(timer);
  }, [destinationCartonId]);

  const { data: targetCarton, isLoading, isError } = useCartonDetail(
    debouncedId && debouncedId !== sourceCartonId ? debouncedId : ""
  );

  const handleSubmit = () => {
    mutation.mutate(
      { sourceCartonId, destinationCartonId, packCount },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDestinationCartonId("");
          setPackCount(1);
        },
      }
    );
  };

  const isSameCatrton = debouncedId && debouncedId === sourceCartonId;
  const skuMismatch = targetCarton && sourceSku && targetCarton.sku !== sourceSku;
  const overLimit = packCount > sourcePacks;

  const canSubmit =
    !mutation.isPending &&
    destinationCartonId.trim() &&
    !isSameCatrton &&
    !skuMismatch &&
    !isError &&
    !overLimit &&
    !!targetCarton;

  const fillPercent = targetCarton
    ? Math.min(100, (targetCarton.currentPacks / targetCarton.capacity) * 100)
    : 0;

  return (
    <ResponsiveSheet
      title="Transfer Packs"
      description="Move packs between cartons in the same batch"
      icon={ArrowRightLeft}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={destinationCartonId !== "" || packCount !== 1}
    >
      <div className="flex flex-col gap-6 py-4">

        {/* ── Source carton ────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <Package className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-semibold text-foreground tracking-tight">
              {sourceSku ?? "Unknown SKU"}
            </span>
            <span className="text-sm font-medium tabular-nums">
              <span className="text-foreground font-semibold">{sourcePacks}</span>
              <span className="text-muted-foreground ml-1">packs available</span>
            </span>
          </div>
        </div>

        {/* ── Destination ID ───────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="destinationCartonId" className="text-sm font-medium text-foreground">
            Destination carton ID
          </Label>
          <div className="relative">
            <Input
              id="destinationCartonId"
              placeholder="Scan or paste carton ID"
              value={destinationCartonId}
              onChange={(e) => setDestinationCartonId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "h-10 font-mono text-sm pr-10",
                isSameCatrton && "border-amber-500 focus-visible:ring-amber-500/20",
                (isError || skuMismatch) && "border-destructive focus-visible:ring-destructive/20",
                targetCarton && !skuMismatch && "border-green-600 focus-visible:ring-green-600/20"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isLoading && (
                <Loader2 className="size-4 text-muted-foreground animate-spin" />
              )}
              {targetCarton && !skuMismatch && !isLoading && (
                <CheckCircle2 className="size-4 text-green-600" />
              )}
              {(isError || skuMismatch) && !isLoading && (
                <AlertCircle className="size-4 text-destructive" />
              )}
            </div>
          </div>

          {/* Inline validation messages */}
          <AnimatePresence mode="wait">
            {isSameCatrton && (
              <motion.p
                key="same"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-amber-600 flex items-center gap-1.5"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                Source and destination cannot be the same carton.
              </motion.p>
            )}
            {debouncedId && debouncedId !== sourceCartonId && isError && !isLoading && (
              <motion.p
                key="not-found"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-destructive flex items-center gap-1.5"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                Carton not found.
              </motion.p>
            )}
            {skuMismatch && (
              <motion.p
                key="sku"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-destructive flex items-center gap-1.5"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                SKU mismatch — source is <strong className="font-semibold">{sourceSku}</strong>, destination is{" "}
                <strong className="font-semibold">{targetCarton?.sku}</strong>.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Destination carton preview */}
          <AnimatePresence>
            {targetCarton && !skuMismatch && debouncedId !== sourceCartonId && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/20 px-4 py-3.5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-500">
                    Valid destination
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">SKU</p>
                    <p className="text-sm font-semibold text-foreground tracking-tight">
                      {targetCarton.sku ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Capacity</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums tracking-tight">
                      {targetCarton.currentPacks}{" "}
                      <span className="text-muted-foreground font-normal">/ {targetCarton.capacity}</span>
                    </p>
                  </div>
                </div>

                {/* Capacity bar */}
                <div className="w-full h-1.5 rounded-full bg-green-200/60 dark:bg-green-900/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Pack count ───────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="packCount" className="text-sm font-medium text-foreground">
              Packs to transfer
            </Label>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              max {sourcePacks}
            </span>
          </div>
          <Input
            id="packCount"
            type="number"
            min={1}
            max={sourcePacks}
            value={packCount}
            onChange={(e) =>
              setPackCount(Math.max(1, parseInt(e.target.value) || 1))
            }
            className={cn(
              "h-10 font-semibold text-sm",
              overLimit && "border-destructive focus-visible:ring-destructive/20"
            )}
          />
          {overLimit && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="size-3.5 shrink-0" />
              Cannot exceed {sourcePacks} packs from this carton.
            </p>
          )}
        </div>

        {/* ── Submit ───────────────────────────────────────── */}
        <Button
          className="w-full h-10"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Transferring…
            </>
          ) : (
            <>Transfer {packCount} pack{packCount !== 1 ? "s" : ""}</>
          )}
        </Button>

      </div>
    </ResponsiveSheet>
  );
}