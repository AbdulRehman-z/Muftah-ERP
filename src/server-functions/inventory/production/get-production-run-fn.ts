import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { db, productionRuns, chemicals, packagingMaterials } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getProductionRunsFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		const runs = await db.query.productionRuns.findMany({
			orderBy: [desc(productionRuns.createdAt)],
			with: {
				recipe: {
					with: {
						product: true,
					},
				},
				warehouse: true,
				operator: true,
				materialsUsed: true,
			},
			limit: 100,
		});

		// Fetch all materials to map names
		const allChemicals = await db.select({ id: chemicals.id, name: chemicals.name }).from(chemicals);
		const allPackaging = await db.select({ id: packagingMaterials.id, name: packagingMaterials.name }).from(packagingMaterials);

		const chemicalMap = new Map(allChemicals.map(c => [c.id, c.name]));
		const packagingMap = new Map(allPackaging.map(p => [p.id, p.name]));

		// Enrich materialsUsed with names
		const enrichedRuns = runs.map(run => ({
			...run,
			materialsUsed: run.materialsUsed.map(mu => ({
				...mu,
				materialName: mu.materialType === 'chemical'
					? (chemicalMap.get(mu.materialId) || 'Unknown Chemical')
					: (packagingMap.get(mu.materialId) || 'Unknown Packaging')
			}))
		}));

		return enrichedRuns;
	});
