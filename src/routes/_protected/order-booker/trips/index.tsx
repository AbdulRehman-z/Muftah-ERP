import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Truck, Bike, Car } from "lucide-react";
import { formatPKR } from "@/lib/currency-format";
import { getMyTripsFn, createMyTripFn } from "@/server-functions/sales/order-booker-self-service-fn";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_protected/order-booker/trips/")({
  component: MyTripsPage,
});

function MyTripsPage() {
  const { data: trips, isLoading, refetch } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => getMyTripsFn({ data: {} }),
  });

  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          Log Trip
        </Button>
      </div>

      {createOpen && (
        <CreateTripForm onSuccess={() => { setCreateOpen(false); refetch(); }} onCancel={() => setCreateOpen(false)} />
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Date</TableHead>
              <TableHead className="text-[11px]">Area</TableHead>
              <TableHead className="text-[11px]">Distance</TableHead>
              <TableHead className="text-[11px]">Vehicle</TableHead>
              <TableHead className="text-[11px] text-right">TADA</TableHead>
              <TableHead className="text-[11px] text-right">Fuel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!trips?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                  No trips logged yet.
                </TableCell>
              </TableRow>
            ) : (
              trips.map((trip: any) => (
                <TableRow key={trip.id}>
                  <TableCell className="text-sm">{format(new Date(trip.date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm">{trip.areaVisited}</TableCell>
                  <TableCell className="text-sm">{trip.distanceKm} km</TableCell>
                  <TableCell className="text-sm">
                    <VehicleBadge type={trip.vehicleType} />
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{formatPKR(Number(trip.tadaAmount))}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{formatPKR(Number(trip.fuelCost))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function VehicleBadge({ type }: { type: string }) {
  return type === "own" ? (
    <span className="flex items-center gap-1 text-xs text-blue-600">
      <Bike className="size-3" /> Own
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-emerald-600">
      <Car className="size-3" /> Company
    </span>
  );
}

function CreateTripForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [area, setArea] = useState("");
  const [distance, setDistance] = useState("");
  const [vehicleType, setVehicleType] = useState<"own" | "company">("own");
  const [fuelCost, setFuelCost] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !area || !distance) {
      toast.error("Date, area, and distance are required");
      return;
    }
    setSubmitting(true);
    try {
      await createMyTripFn({
        data: {
          date,
          areaVisited: area,
          distanceKm: Number(distance),
          vehicleType,
          fuelCost: vehicleType === "own" ? Number(fuelCost || 0) : undefined,
          notes: notes || undefined,
        },
      });
      toast.success("Trip logged");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to log trip");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Log Trip</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Date *</label>
            <input type="date" className="w-full h-9 px-2 text-sm rounded-md border" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Area Visited *</label>
            <input className="w-full h-9 px-2 text-sm rounded-md border" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Distance (km) *</label>
            <input type="number" min={0} step="0.1" className="w-full h-9 px-2 text-sm rounded-md border" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Vehicle *</label>
            <select className="w-full h-9 px-2 text-sm rounded-md border bg-background" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as any)}>
              <option value="own">Own Vehicle</option>
              <option value="company">Company Vehicle</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Fuel Cost (PKR)</label>
            <input type="number" min={0} className="w-full h-9 px-2 text-sm rounded-md border" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} disabled={vehicleType === "company"} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Notes</label>
          <input className="w-full h-9 px-2 text-sm rounded-md border" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            <Truck className="size-4 mr-1.5" />
            {submitting ? "Saving…" : "Log Trip"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
