import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/sales/people/order-bookers/$orderBookerId/")({
  component: OrderBookerProfilePage,
});

function OrderBookerProfilePage() {
  const { orderBookerId } = useParams({ from: "/_protected/sales/people/order-bookers/$orderBookerId/" });
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.history.back()}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Order Booker Profile</h1>
      </div>
      <p className="text-muted-foreground">Order Booker ID: {orderBookerId}</p>
      <p className="text-sm text-muted-foreground">Full profile with orders, ledger, and transport costs coming soon.</p>
    </div>
  );
}
