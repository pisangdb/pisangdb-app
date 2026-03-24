import { type Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SandboxesListPage extends BasePage {
	constructor(page: Page) {
		super(page, "/dashboard/sandboxes");
	}

	async waitForPageLoad(): Promise<void> {
		await expect(this.page.getByRole("heading", { name: "Sandboxes" })).toBeVisible({ timeout: 10000 });
	}

	async clickNewSandbox(): Promise<void> {
		const newSandboxLink = this.page.getByRole("link", { name: /new sandbox/i }).first();
		await expect(newSandboxLink).toBeVisible({ timeout: 10000 });
		await newSandboxLink.click();
	}

	async getSandboxLinks(): Promise<string[]> {
		const sandboxLinks = this.page.locator("a[href*='/dashboard/sandboxes/']").filter({ hasText: /pisang_|sb_/i });
		const count = await sandboxLinks.count();
		const links: string[] = [];
		for (let i = 0; i < count; i++) {
			const href = await sandboxLinks.nth(i).getAttribute("href");
			if (href) links.push(href);
		}
		return links;
	}
}
