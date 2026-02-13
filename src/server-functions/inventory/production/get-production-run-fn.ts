import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, productionRuns, chemicals, packagingMaterials } from "@/db";
import { requireAdminMiddleware, requireAuthMiddleware } from "@/lib/middlewares";

export const getProductionRunsFn = createServerFn()
	.middleware([requireAuthMiddleware])
	.inputValidator(z.object({
		filter: z.enum(["active"]).optional(),
		runId: z.string().optional(),
	}).optional())
	.handler(async ({ data }) => {
		let whereClause;

		if (data?.runId) {
			// Specific Run (Any Status)
			whereClause = eq(productionRuns.id, data.runId);
		} else if (data?.filter === "active") {
			// Active Runs Only
			whereClause = eq(productionRuns.status, "in_progress");
		}

		const runs = await db.query.productionRuns.findMany({
			...(whereClause ? { where: whereClause } : {}),
			orderBy: [desc(productionRuns.createdAt)],
			with: {
				recipe: {
					with: {
						product: true,
						ingredients: {
							with: {
								chemical: true
							}
						},
						packaging: {
							with: {
								packagingMaterial: true
							}
						},
						containerPackaging: true,
						cartonPackaging: true
					},
				},
				warehouse: true,
				operator: true,
				materialsUsed: true,
			},
			limit: data?.runId ? 1 : 100,
		});

		// Fetch all materials to map names
		const allChemicals = await db.select({ id: chemicals.id, name: chemicals.name }).from(chemicals);
		const allPackaging = await db.select({ id: packagingMaterials.id, name: packagingMaterials.name }).from(packagingMaterials);

		const chemicalMap = new Map(allChemicals.map(c => [c.id, c.name]));
		const packagingMap = new Map(allPackaging.map(p => [p.id, p.name]));

		// Enrich materialsUsed with names
		const enrichedRuns = runs.map(run => ({
			...run,
			materialsUsed: run.materialsUsed?.map(mu => ({
				...mu,
				materialName: mu.materialType === 'chemical'
					? (chemicalMap.get(mu.materialId) || 'Unknown Chemical')
					: (packagingMap.get(mu.materialId) || 'Unknown Packaging')
			})) || []
		}));

		return enrichedRuns;
	});
