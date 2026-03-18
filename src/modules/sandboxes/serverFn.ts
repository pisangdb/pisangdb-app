import { createServerFn } from "@tanstack/react-start";
import type {
	CreateSandboxInput,
	DashboardStats,
	ExtendSandboxInput,
	SandboxDetail,
	SandboxListItem,
	SandboxTable,
} from "#/lib/types";
import {
	createSandboxSchema,
	extendSandboxSchema,
	sandboxIdSchema,
} from "./schema";

const MOCK_SANDBOXES: SandboxDetail[] = [
	{
		id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		displayName: "test-migration",
		engine: "postgresql",
		region: "id",
		status: "active",
		host: "id.pisangdb.com",
		port: 5432,
		dbName: "pisang_a1b2_test-migration_k8m2n4",
		dbUser: "sb_a1b2x8",
		dbPassword: "mock_password_32chars_xxxxxxxx",
		connectionUrl:
			"postgresql://sb_a1b2x8:mock_password_32chars_xxxxxxxx@id.pisangdb.com:5432/pisang_a1b2_test-migration_k8m2n4",
		sizeMb: 12,
		maxSizeMb: 100,
		createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		expiredAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "9b1deb4d-3eb7-4c81-aceb-7e3b5d1f2a3c",
		displayName: "ecommerce-dev",
		engine: "mysql",
		region: "id",
		status: "active",
		host: "id.pisangdb.com",
		port: 3306,
		dbName: "pisang_c3d4_ecommerce-dev_z7j1n3",
		dbUser: "sb_c3d4y9",
		dbPassword: "mock_password_32chars_yyyyyyyy",
		connectionUrl:
			"mysql://sb_c3d4y9:mock_password_32chars_yyyyyyyy@id.pisangdb.com:3306/pisang_c3d4_ecommerce-dev_z7j1n3",
		sizeMb: 45,
		maxSizeMb: 100,
		createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
		expiredAt: new Date(Date.now() + 19 * 60 * 60 * 1000).toISOString(),
	},
];

export const $getDashboardStats = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardStats> => {
		return {
			activeSandboxes: 2,
			totalCreated: 14,
			autoCleaned: 12,
			aiQueriesThisMonth: 8,
		};
	},
);

export const $getSandboxes = createServerFn({ method: "GET" }).handler(
	async (): Promise<SandboxListItem[]> => {
		return MOCK_SANDBOXES.map(({ dbPassword: _pw, ...item }) => item);
	},
);

export const $getSandboxById = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const found = MOCK_SANDBOXES.find((s) => s.id === data.sandboxId);
		if (!found) throw new Error("Sandbox not found");
		return found;
	});

export const $createSandbox = createServerFn({ method: "POST" })
	.inputValidator(createSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const input = data as CreateSandboxInput;
		const port =
			input.engine === "postgresql"
				? 5432
				: input.engine === "mysql"
					? 3306
					: 3307;
		const now = new Date();
		const expiredAt = new Date(
			now.getTime() + input.retentionHours * 60 * 60 * 1000,
		);
		const mockSuffix = Math.random().toString(36).slice(2, 8);
		const dbName = `pisang_mock_${input.displayName}_${mockSuffix}`;
		const dbUser = `sb_${Math.random().toString(36).slice(2, 10)}`;
		const dbPassword = "mock_password_32chars_zzzzzzzz";
		const proto = input.engine === "postgresql" ? "postgresql" : "mysql";
		const connectionUrl = `${proto}://${dbUser}:${dbPassword}@${input.region}.pisangdb.com:${port}/${dbName}`;

		return {
			id: crypto.randomUUID(),
			displayName: input.displayName,
			engine: input.engine,
			region: input.region,
			status: "active",
			host: `${input.region}.pisangdb.com`,
			port,
			dbName,
			dbUser,
			dbPassword,
			connectionUrl,
			sizeMb: 0,
			maxSizeMb: 100,
			createdAt: now.toISOString(),
			expiredAt: expiredAt.toISOString(),
		};
	});

export const $extendSandbox = createServerFn({ method: "POST" })
	.inputValidator(extendSandboxSchema)
	.handler(async ({ data }): Promise<SandboxDetail> => {
		const input = data as ExtendSandboxInput;
		const found = MOCK_SANDBOXES.find((s) => s.id === input.sandboxId);
		if (!found) throw new Error("Sandbox not found");
		const newExpiry = new Date(
			new Date(found.expiredAt).getTime() +
				input.additionalHours * 60 * 60 * 1000,
		);
		return { ...found, expiredAt: newExpiry.toISOString() };
	});

export const $deleteSandbox = createServerFn({ method: "POST" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data }): Promise<void> => {
		console.log(`[mock] deleting sandbox ${data.sandboxId}`);
	});

export const $getSandboxTables = createServerFn({ method: "GET" })
	.inputValidator(sandboxIdSchema)
	.handler(async ({ data: _data }): Promise<SandboxTable[]> => {
		return [
			{ name: "users", rows: 20, sizeKb: 48 },
			{ name: "products", rows: 50, sizeKb: 112 },
			{ name: "orders", rows: 15, sizeKb: 32 },
		];
	});
