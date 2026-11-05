import { expect, test } from '@playwright/test';

test('rating filters expose their star threshold in the accessible name @accessibility', async ({
  page,
}) => {
  await page.goto('/products');
  for (const rating of [4, 3, 2, 1]) {
    await expect
      .soft(
        page.getByTestId(`filter-rating-${rating}`),
        `A screen reader must distinguish the ${rating}-star threshold from other ratings`,
      )
      .toHaveAccessibleName(new RegExp(`\\b${rating}\\b`), { timeout: 1_000 });
  }
});
