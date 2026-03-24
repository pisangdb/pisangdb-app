import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export interface TableInfo {
	name: string;
	rows: number;
}

export class SandboxDetailPage extends BasePage {
	private tablesTab: Locator;
	private tablesList: Locator;

	constructor(page: Page, sandboxId?: string) {
		const pagePath = sandboxId ? `/dashboard/sandboxes/${sandboxId}` : "/dashboard/sandboxes/";
		super(page, pagePath);
		this.tablesTab = page.getByRole("tab", { name: /tables/i });
		this.tablesList = page.locator("[class*='table']");
	}

	async waitForPageLoad(): Promise<void> {
		await expect(this.page.getByText(/Engine:|Host:|Port:/)).toBeVisible({ timeout: 15000 });
	}

	async clickTablesTab(): Promise<void> {
		await this.tablesTab.click();
		await this.page.waitForTimeout(500);
	}

	async getTables(): Promise<TableInfo[]> {
		const tableRows = this.page.locator("tbody tr");
		const count = await tableRows.count();
		const tables: TableInfo[] = [];

		for (let i = 0; i < count; i++) {
			const row = tableRows.nth(i);
			const cells = row.locator("td");
			const cellCount = await cells.count();

			if (cellCount >= 2) {
				const name = await cells.nth(0).textContent();
				const rowsText = await cells.nth(1).textContent();
				const rows = parseInt(rowsText ?? "0", 10);

				if (name) {
					tables.push({ name: name.trim(), rows });
				}
			}
		}

		return tables;
	}

	async getSandboxIdFromUrl(): Promise<string | null> {
		const url = this.page.url();
		const match = url.match(/\/dashboard\/sandboxes\/([a-f0-9-]+)/);
		return match ? match[1] : null;
	}
}
