import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// ============================================================================
// USERS TABLE
// ============================================================================
export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").unique().notNull(),
	passwordHash: text("password_hash").notNull(),
	name: text("name").notNull(),
	role: text("role").notNull().default("user"),
	githubId: text("github_id").unique(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ============================================================================
// TEMPLATES TABLE
// ============================================================================
export const templates = pgTable("templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	engine: text("engine").notNull(),
	ddlSql: text("ddl_sql").notNull(),
	seedSql: text("seed_sql"),
	isBuiltin: boolean("is_builtin").notNull().default(false),
	userId: uuid("user_id").references(() => users.id),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ============================================================================
// SANDBOXES TABLE
// ============================================================================
export const sandboxes = pgTable(
	"sandboxes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.references(() => users.id)
			.notNull(),
		engine: text("engine").notNull(),
		region: text("region").notNull().default("id"),
		dbName: text("db_name").notNull(),
		dbUser: text("db_user").notNull(),
		dbPassword: text("db_password").notNull(),
		connectionUrl: text("connection_url").notNull(),
		host: text("host").notNull(),
		port: integer("port").notNull(),
		displayName: text("display_name").notNull(),
		status: text("status").notNull().default("active"),
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
	(table) => [
		uniqueIndex("idx_sandboxes_db_name").on(table.dbName),
		index("idx_sandboxes_user_id").on(table.userId),
		index("idx_sandboxes_engine").on(table.engine),
		index("idx_sandboxes_region").on(table.region),
		index("idx_sandboxes_status").on(table.status),
	],
);

// Manual indexes for sandboxes (not unique)
// Note: These will be created via migrations
export const sandboxIndexes = {
	userId: "idx_sandboxes_user_id",
	engine: "idx_sandboxes_engine",
	region: "idx_sandboxes_region",
	statusExpired: "idx_sandboxes_status_expired",
};

// ============================================================================
// AI_LOGS TABLE
// ============================================================================
export const aiLogs = pgTable("ai_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	sandboxId: uuid("sandbox_id")
		.references(() => sandboxes.id)
		.notNull(),
	userId: uuid("user_id")
		.references(() => users.id)
		.notNull(),
	prompt: text("prompt").notNull(),
	response: text("response").notNull(),
	sqlGenerated: text("sql_generated"),
	executed: boolean("executed").notNull().default(false),
	tokensUsed: integer("tokens_used"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ============================================================================
// QUERY_HISTORY TABLE
// ============================================================================
export const queryHistory = pgTable("query_history", {
	id: uuid("id").primaryKey().defaultRandom(),
	sandboxId: uuid("sandbox_id")
		.references(() => sandboxes.id)
		.notNull(),
	query: text("query").notNull(),
	status: text("status").notNull(),
	executionTimeMs: integer("execution_time_ms"),
	rowsAffected: integer("rows_affected"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================
export const notifications = pgTable(
	"notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sandboxId: uuid("sandbox_id")
			.references(() => sandboxes.id)
			.notNull(),
		userId: uuid("user_id")
			.references(() => users.id)
			.notNull(),
		type: text("type").notNull(),
		message: text("message").notNull(),
		readAt: timestamp("read_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("idx_notifications_sandbox_type").on(
			table.sandboxId,
			table.type,
		),
	],
);

// ============================================================================
// RELATIONS
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
	sandboxes: many(sandboxes),
	aiLogs: many(aiLogs),
	templates: many(templates),
}));

export const sandboxesRelations = relations(sandboxes, ({ one, many }) => ({
	user: one(users, {
		fields: [sandboxes.userId],
		references: [users.id],
	}),
	template: one(templates, {
		fields: [sandboxes.templateId],
		references: [templates.id],
	}),
	aiLogs: many(aiLogs),
	queryHistory: many(queryHistory),
}));

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
	sandbox: one(sandboxes, {
		fields: [aiLogs.sandboxId],
		references: [sandboxes.id],
	}),
	user: one(users, {
		fields: [aiLogs.userId],
		references: [users.id],
	}),
}));

export const queryHistoryRelations = relations(queryHistory, ({ one }) => ({
	sandbox: one(sandboxes, {
		fields: [queryHistory.sandboxId],
		references: [sandboxes.id],
	}),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	sandbox: one(sandboxes, {
		fields: [notifications.sandboxId],
		references: [sandboxes.id],
	}),
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id],
	}),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
	user: one(users, {
		fields: [templates.userId],
		references: [users.id],
	}),
	sandboxes: many(sandboxes),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Sandbox = typeof sandboxes.$inferSelect;
export type NewSandbox = typeof sandboxes.$inferInsert;

export type AiLog = typeof aiLogs.$inferSelect;
export type NewAiLog = typeof aiLogs.$inferInsert;

export type QueryHistory = typeof queryHistory.$inferSelect;
export type NewQueryHistory = typeof queryHistory.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type UserRole = "user" | "admin";
export type SandboxStatus = "active" | "destroying" | "expired";
export type DatabaseEngine = "postgresql" | "mysql" | "mariadb";
export type Region = "id" | "sg" | "us" | "eu";
