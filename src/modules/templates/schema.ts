import { z } from "zod";

export const getTemplatesSchema = z.object({
	engine: z.enum(["postgresql", "mysql", "mariadb"]).optional(),
});
