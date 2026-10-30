import { test, expect, type Page } from "@playwright/test";
async function fillBonus(page: Page, total?: number) {
  const nums = (await page.getByRole("math").getAttribute("aria-label"))!
    .match(/\d+/g)!
    .map(Number);
  const value = String(total ?? nums.reduce((a, b) => a + b, 0)).padStart(
    3,
    "0",
  );
  await page.getByLabel("Ones answer", { exact: true }).fill(value[2]);
  await page.getByLabel("Tens answer", { exact: true }).fill(value[1]);
  await page.getByLabel("Hundreds answer", { exact: true }).fill(value[0]);
  await page.getByRole("button", { name: "Check ↵" }).click();
}
test("complete practice, reward, persistence, and parent dashboard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByText("Small steps.")).toBeVisible();
  await page.getByRole("button", { name: "Let’s practice" }).click();
  for (let i = 0; i < 5; i++) {
    const text = await page.locator(".equation").innerText();
    const nums = text.match(/\d+/g)!.map(Number);
    await page.getByLabel("Your answer").fill(String(nums[0] + nums[1]));
    await page.getByLabel("Your answer").press("Enter");
    await page
      .getByRole("button", {
        name: i === 4 ? "Start two-minute round" : "Next problem",
      })
      .click();
  }
  for (let i = 0; i < 3; i++) {
    const nums = (await page.locator(".equation").innerText())
      .match(/\d+/g)!
      .map(Number);
    await page.getByLabel("Your answer").fill(String(nums[0] + nums[1]));
    await page.getByLabel("Your answer").press("Enter");
  }
  await page.clock.fastForward(121000);
  await expect(page.getByText("Give your brain a stretch.")).toBeVisible();
  await fillBonus(page, 999);
  await expect(
    page.getByText("Remember to carry", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.screenshot({
    path: `/private/tmp/math-minutes-columns-${test.info().project.name}.png`,
    fullPage: true,
  });
  await fillBonus(page);
  await expect(page.getByText("Look at you grow!")).toBeVisible();
  await expect(page.locator(".reward-orb")).toContainText("+12");
  await page.getByRole("button", { name: "All done for now" }).click();
  await page.reload();
  await expect(page.locator(".minute-number")).toContainText("12");
  await page.getByRole("button", { name: "Parent space" }).click();
  await page.getByLabel("Parent gate answer").fill("21");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("Session history", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `/private/tmp/math-minutes-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("subtraction, wrong-answer review, and bonus-disabled completion", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.screenshot({
    path: `/private/tmp/math-minutes-home-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Parent space" }).click();
  await page.getByLabel("Parent gate answer").fill("21");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Optional bonus challenges").uncheck();
  await page.getByRole("button", { name: "math minutes" }).click();
  await page
    .getByRole("button", {
      name: "Subtraction Find the difference.",
      exact: false,
    })
    .click();
  await page.getByRole("button", { name: "Let’s practice" }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Your answer").fill("999");
    await page.getByLabel("Your answer").press("Enter");
    await expect(page.locator(".feedback")).toBeVisible();
    await page
      .getByRole("button", {
        name: i === 4 ? "Start two-minute round" : "Next problem",
      })
      .click();
  }
  await page.getByRole("button", { name: "9", exact: true }).click();
  await page.getByRole("button", { name: "9", exact: true }).click();
  await page.getByRole("button", { name: "Backspace", exact: true }).click();
  await expect(page.getByLabel("Your answer")).toHaveValue("9");
  await page.getByLabel("Your answer").fill("999");
  await page.getByRole("button", { name: "Go ↵" }).click();
  await page.clock.fastForward(121000);
  await expect(page.getByText("Look at you grow!")).toBeVisible();
  await expect(page.locator(".reward-orb")).toContainText("+5");
  await page.getByRole("button", { name: "Review missed problems" }).click();
  await expect(page.locator(".review")).toContainText(
    /Think of|Then take away/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("direct bonus digit entry, carry notes, rewards, and daily limits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bonus practice" }).click();
  await expect(page.getByLabel("Ones answer", { exact: true })).toBeFocused();
  await page.getByLabel("Carry into tens").click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByLabel("Carry into tens")).toHaveValue("2");
  await page.getByLabel("Ones answer", { exact: true }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(page.getByLabel("Ones answer", { exact: true })).toHaveValue(
    "3",
  );
  await page.getByLabel("Ones answer", { exact: true }).press("ArrowLeft");
  await expect(page.getByLabel("Tens answer", { exact: true })).toBeFocused();
  await page.screenshot({
    path: `/private/tmp/math-minutes-digit-boxes-${test.info().project.name}.png`,
    fullPage: true,
  });
  await fillBonus(page);
  await expect(page.getByText("Nicely added!")).toBeVisible();
  await expect(
    page.getByText("+2 game minutes earned", { exact: false }),
  ).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Try another question" }).click();
    await fillBonus(page);
  }
  await expect(
    page.getByText("Today’s reward limit applies.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to home", exact: true }).click();
  await expect(page.locator(".minute-number")).toContainText("4");
  await page.reload();
  await expect(page.locator(".minute-number")).toContainText("4");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("math-minutes-v1")!),
  );
  expect(data.sessions).toHaveLength(0);
  expect(data.daily.sessions).toBe(2);
  expect(data.bonusHistory).toHaveLength(3);
  expect(Object.keys(data.records)).toHaveLength(0);
});
