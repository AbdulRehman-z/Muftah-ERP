import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/sales/people/salesmen/$salesmanId/shops/$customerId")({
  component: PerShopLedgerPage,
});

function PerShopLedgerPage() {
  const { salesmanId, customerId } = useParams({ from: "/_protected/sales/people/salesmen/$salesmanId/shops/$customerId" });
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.history.back()}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Shop Ledger</h1>
      </div>
      <p className="text-muted-foreground">Salesman: {salesmanId} | Shop: {customerId}</p>
      <p className="text-sm text-muted-foreground">Per-shop ledger scoped to salesman coming soon.</p>
    </div>
  );
}
