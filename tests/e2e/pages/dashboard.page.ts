import { type Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
	constructor(page: Page) {
		super(page, "/dashboard");
	}

	async waitForPageLoad(): Promise<void> {
		await expect(this.page.getByText("Active Sandboxes")).toBeVisible({ timeout: 10000 });
	}

	async clickNewSandbox(): Promise<void> {
		const newSandboxLink = this.page.getByRole("link", { name: /new sandbox/i }).first();
		await expect(newSandboxLink).toBeVisible({ timeout: 10000 });
		await newSandboxLink.click();
	}
}
