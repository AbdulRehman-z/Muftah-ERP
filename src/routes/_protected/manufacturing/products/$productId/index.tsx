import { createFileRoute } from "@tanstack/react-router";
import { getProductDetailFn } from "@/server-functions/inventory/products/get-product-detail-fn";
import { ProductDetailView } from "@/components/recipes/product-detail-view";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute(
  "/_protected/manufacturing/products/$productId/",
)({
  loader: async ({ context: { queryClient }, params: { productId } }) => {
    return queryClient.ensureQueryData({
      queryKey: ["product-detail", productId],
      queryFn: () => getProductDetailFn({ data: { id: productId } }),
    });
  },
  component: ProductDetailPage,
  errorComponent: () => (
    <div className="p-8 text-center text-destructive">
      Failed to load product details.
    </div>
  ),
  pendingComponent: () => (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  ),
});

function ProductDetailPage() {
  const data = Route.useLoaderData();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <ProductDetailView data={data} />
      </div>
    </main>
  );
}
