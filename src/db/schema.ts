import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

// ─── better-auth managed tables ───────────────────────────────────────────────
// Jangan ubah struktur kolom di bawah kecuali ikuti better-auth migration guide.
// Docs: https://www.better-auth.com/docs/concepts/database

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").unique().notNull(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	role: varchar("role", { length: 20 }).notNull().default("user"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text("token").unique().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", {
		withTimezone: true,
	}),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
		withTimezone: true,
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const templates = pgTable("templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name", { length: 50 }).notNull(),
	description: text("description"),
	engine: varchar("engine", { length: 20 }).notNull(),
	ddlSql: text("ddl_sql").notNull(),
	seedSql: text("seed_sql"),
	isBuiltin: boolean("is_builtin").notNull().default(false),
	userId: text("user_id").references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const sandboxes = pgTable(
	"sandboxes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		engine: varchar("engine", { length: 20 }).notNull(),
		region: varchar("region", { length: 10 }).notNull().default("id"),
		dbName: varchar("db_name", { length: 63 }).unique().notNull(),
		dbUser: varchar("db_user", { length: 63 }).notNull(),
		dbPassword: varchar("db_password", { length: 255 }).notNull(),
		connectionUrl: text("connection_url").notNull(),
		host: varchar("host", { length: 255 }).notNull(),
		port: integer("port").notNull(),
		displayName: varchar("display_name", { length: 50 }).notNull(),
		status: varchar("status", { length: 20 }).notNull().default("active"),
		templateId: uuid("template_id").references(() => templates.id),
		maxSizeMb: integer("max_size_mb").notNull().default(100),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiredAt: timestamp("expired_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Ephemeral engine's hot query: WHERE status = 'active' AND expired_at <= NOW()
		index("idx_sandboxes_status_expired").on(t.status, t.expiredAt),
		index("idx_sandboxes_user_id").on(t.userId),
		index("idx_sandboxes_engine").on(t.engine),
		index("idx_sandboxes_region").on(t.region),
	],
);

export const queryHistory = pgTable("query_history", {
	id: uuid("id").primaryKey().defaultRandom(),
	sandboxId: uuid("sandbox_id")
		.notNull()
		.references(() => sandboxes.id),
	query: text("query").notNull(),
	status: varchar("status", { length: 20 }).notNull(),
	executionTimeMs: integer("execution_time_ms"),
	rowsAffected: integer("rows_affected"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const aiLogs = pgTable("ai_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	sandboxId: uuid("sandbox_id")
		.notNull()
		.references(() => sandboxes.id),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	prompt: text("prompt").notNull(),
	response: text("response").notNull(),
	sqlGenerated: text("sql_generated"),
	executed: boolean("executed").notNull().default(false),
	tokensUsed: integer("tokens_used"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;

export type Sandbox = typeof sandboxes.$inferSelect;
export type NewSandbox = typeof sandboxes.$inferInsert;

export type QueryHistory = typeof queryHistory.$inferSelect;
export type NewQueryHistory = typeof queryHistory.$inferInsert;

export type AiLog = typeof aiLogs.$inferSelect;
export type NewAiLog = typeof aiLogs.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
