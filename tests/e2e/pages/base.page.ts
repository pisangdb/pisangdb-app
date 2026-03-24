import { type Page, type Locator, expect } from "@playwright/test";

const TEST_BASE_URL = "http://localhost:3001";

export class BasePage {
	protected page: Page;
	protected pagePath: string;

	constructor(page: Page, pagePath: string) {
		this.page = page;
		this.pagePath = pagePath;
	}

	async goto(): Promise<void> {
		const fullUrl = this.pagePath.startsWith("http")
			? this.pagePath
			: `${TEST_BASE_URL}${this.pagePath}`;
		await this.page.goto(fullUrl);
	}

	async waitForLoadState(state: "load" | "domcontentloaded" | "networkidle" = "load"): Promise<void> {
		await this.page.waitForLoadState(state);
	}

	async waitForURL(pattern: RegExp | string, options?: { timeout?: number }): Promise<void> {
		await this.page.waitForURL(pattern, options);
	}

	getByRole(role: "button" | "heading" | "link" | "textbox", name: RegExp | string, options?: { exact?: boolean }): Locator {
		return this.page.getByRole(role, name, options);
	}

	getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
		return this.page.getByText(text, options);
	}

	locator(selector: string): Locator {
		return this.page.locator(selector);
	}

	async expectVisible(selector: string | Locator, timeout?: number): Promise<void> {
		const loc = typeof selector === "string" ? this.page.locator(selector) : selector;
		await expect(loc).toBeVisible({ timeout: timeout ?? 10000 });
	}

	async click(selector: string | Locator): Promise<void> {
		const loc = typeof selector === "string" ? this.page.locator(selector) : selector;
		await loc.click();
	}

	async fill(selector: string | Locator, value: string): Promise<void> {
		const loc = typeof selector === "string" ? this.page.locator(selector) : selector;
		await loc.fill(value);
	}
}
