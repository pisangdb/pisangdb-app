import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export type Engine = "postgresql" | "mysql" | "mariadb";

export interface TemplateOption {
	id: string;
	name: string;
}

export class NewSandboxPage extends BasePage {
	private engineButtons: Locator;
	private regionButtons: Locator;
	private nameInput: Locator;
	private retentionSelect: Locator;
	private templateSelect: Locator;
	private createButton: Locator;

	constructor(page: Page) {
		super(page, "/dashboard/sandboxes/new");
		this.engineButtons = page.locator("button", { hasText: /🐘|🐬|🦭/ });
		this.regionButtons = page.locator("button", { hasText: /🇮🇩|🇸🇬|🇺🇸/ });
		this.nameInput = page.getByLabel("Sandbox name");
		this.retentionSelect = page.locator("select#retention");
		this.templateSelect = page.locator("select#template");
		this.createButton = page.getByRole("button", { name: /create sandbox/i }).first();
	}

	async waitForPageLoad(): Promise<void> {
		await expect(this.page.getByText("Sandbox Configuration")).toBeVisible({ timeout: 10000 });
	}

	async selectEngine(engine: Engine): Promise<void> {
		const engineLabels: Record<Engine, string> = {
			postgresql: "🐘 PostgreSQL 16",
			mysql: "🐬 MySQL 8",
			mariadb: "🦭 MariaDB 11",
		};
		const button = this.page.locator("button", { hasText: engineLabels[engine] });
		await button.click();
	}

	async getAvailableTemplates(): Promise<TemplateOption[]> {
		// Wait for templates to load (they're fetched based on selected engine)
		// Wait until there are more options than just "Blank"
		await this.page.waitForFunction(
			() => {
				const select = document.getElementById("template");
				if (!select) return false;
				return select.options.length > 1; // More than just "Blank"
			},
			{ timeout: 10000 },
		).catch(() => {
			// If timeout, just return what's available
		});

		const options = await this.templateSelect.locator("option").all();
		const templates: TemplateOption[] = [];

		for (const option of options) {
			const value = await option.getAttribute("value");
			const text = await option.textContent();
			if (value !== null && text !== null) {
				// Include all options
				templates.push({ id: value, name: text });
			}
		}

		return templates;
	}

	async selectTemplate(templateId: string | null): Promise<void> {
		if (templateId === null) {
			await this.templateSelect.selectOption("");
		} else {
			await this.templateSelect.selectOption(templateId);
		}
	}

	async fillSandboxName(name: string): Promise<void> {
		await this.nameInput.click();
		await this.nameInput.press("Control+A");
		await this.nameInput.press("Backspace");
		await this.nameInput.fill(name);
	}

	async selectRetention(retention: string): Promise<void> {
		await this.retentionSelect.selectOption(retention);
	}

	async clickCreateSandbox(): Promise<void> {
		await this.createButton.click();
	}

	async waitForSandboxCreation(timeout?: number): Promise<void> {
		// Wait for redirect to sandboxes list after creation
		// Wait for URL to contain a valid UUID pattern for sandbox detail page
		await this.page.waitForURL(/\/dashboard\/sandboxes\/[a-f0-9-]+/, { timeout: timeout ?? 60000 });
	}

	async getPort(): Promise<number> {
		const portText = await this.page.getByText(/Port: \d+/).first().textContent();
		if (!portText) throw new Error("Port not found");
		const port = parseInt(portText.replace("Port: ", ""), 10);
		return port;
	}

	async getCredentialPreview(): Promise<{ engine: string; port: number; database: string }> {
		const engineText = await this.page.locator("text=Engine:").locator("..").textContent();
		const portText = await this.page.locator("text=Port:").first().textContent();
		const databaseText = await this.page.locator("text=Database:").locator("..").textContent();

		return {
			engine: engineText?.replace("Engine: ", "").trim() ?? "",
			port: portText ? parseInt(portText.replace("Port: ", ""), 10) : 0,
			database: databaseText?.replace("Database: ", "").trim() ?? "",
		};
	}
}
