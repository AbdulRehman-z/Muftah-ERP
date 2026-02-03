import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { OperatorInterface } from "@/components/operator/operator-interface";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";

export const Route = createFileRoute("/operator/")({
	loader: async ({ context }) => {
		void context.queryClient.prefetchQuery({
			queryKey: ["recipes"],
			queryFn: getRecipesFn,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="flex-1 overflow-y-auto bg-gray-50">
			<div className="max-w-4xl mx-auto p-8">
				<header className="text-center mb-8">
					<h1 className="font-bold text-4xl mb-2">Production Operator</h1>
					<p className="text-muted-foreground text-lg">
						Log your production output below
					</p>
				</header>
				<Suspense
					fallback={
						<GenericLoader title="Loading..." description="Please wait..." />
					}
				>
					<OperatorInterface />
				</Suspense>
			</div>
		</main>
	);
}
