import { type Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class RegisterPage extends BasePage {
	constructor(page: Page) {
		super(page, "/register");
	}

	async waitForPageLoad(): Promise<void> {
		await expect(this.page.getByText("Create your PisangDB account")).toBeVisible({ timeout: 10000 });
	}

	async register(name: string, email: string, password: string): Promise<void> {
		await this.page.locator("input#name[name='name']").fill(name);
		await this.page.locator("input#email[name='email']").fill(email);
		await this.page.locator("input#password[name='password']").fill(password);
		await this.page.locator("input#confirmPassword[name='confirmPassword']").fill(password);
		await this.page.locator("input#confirmPassword[name='confirmPassword']").press("Enter");
	}
}
