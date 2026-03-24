import { type Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
	constructor(page: Page) {
		super(page, "/login");
	}

	async waitForPageLoad(): Promise<void> {
		await expect(this.page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
	}

	async login(email: string, password: string): Promise<void> {
		await this.page.locator("input#email[name='email']").fill(email);
		await this.page.locator("input#password[name='password']").fill(password);
		await this.page.getByRole("button", { name: "Sign in", exact: true }).click();
	}
}
