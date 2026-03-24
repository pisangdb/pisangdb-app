import type { DbEngine } from "#/lib/types";
import { BLOG_TEMPLATE } from "./blog";
import { ECOMMERCE_TEMPLATE } from "./ecommerce";
import { HR_TEMPLATE } from "./hr";
import { INVENTORY_TEMPLATE } from "./inventory";

export interface TemplateVariant {
	ddl: string;
	seed: string;
}

export interface TemplateDefinition {
	name: string;
	description: string;
	variants: Record<DbEngine, TemplateVariant>;
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
	ECOMMERCE_TEMPLATE,
	BLOG_TEMPLATE,
	INVENTORY_TEMPLATE,
	HR_TEMPLATE,
];
