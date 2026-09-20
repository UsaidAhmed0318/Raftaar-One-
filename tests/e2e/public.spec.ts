import {test,expect} from '@playwright/test';

test('home shows the hero and main actions', async ({page, isMobile}) => {
  await page.goto('/');
  if (isMobile) await expect(page.getByRole('heading', {name: /Rides, delivery, loaders, buses and more/})).toBeVisible();
  else await expect(page.getByRole('heading', {level: 1})).toContainText('Your city.');
  await expect(page.getByRole('link', {name: /Where to\?|Find your next move/}).first()).toBeVisible();
});

test('every public page fits the screen without sideways scrolling', async ({page}) => {
  test.setTimeout(180_000);
  for (const route of ['/', '/ride', '/driver', '/book', '/marketplace', '/cart', '/account', '/partner', '/help', '/privacy', '/terms']) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow, route).toBe(false);
  }
});

test('intro loader plays on a full load and then clears', async ({page}) => {
  await page.goto('/', {waitUntil: 'commit'});
  await expect(page.locator('.boot')).toBeVisible();
  await expect(page.locator('.boot')).toHaveCount(0, {timeout: 30_000});
  await expect(page.locator('main')).toBeVisible();
});

test('ride and driver pages ask visitors to sign in', async ({page}) => {
  await page.goto('/ride');
  await expect(page.getByRole('heading', {name: 'Sign in to request a ride'})).toBeVisible();
  await page.goto('/driver');
  await expect(page.getByRole('heading', {name: 'Sign in to drive'})).toBeVisible();
});

test('ride services from the cargo form redirect to live ride booking', async ({page}) => {
  await page.goto('/book?service=Bike');
  await expect(page).toHaveURL(/\/ride\?service=Bike/);
});

test('empty cart guides users to the marketplace', async ({page}) => {
  await page.goto('/cart');
  await expect(page.getByRole('heading', {name: 'A little room for something good.'})).toBeVisible();
});

test('unknown route has a useful 404', async ({page}) => {
  await page.goto('/not-a-real-route');
  await expect(page.getByRole('heading', {name: 'This stop does not exist.'})).toBeVisible();
});

test('address search suggests places across Pakistan', async ({request}) => {
  const response = await request.get('/api/places?q=' + encodeURIComponent('north nazimabad'));
  expect(response.status()).toBe(200);
  expect((await response.json()).results.length).toBeGreaterThan(0);
});

test('unauthenticated mutation is rejected', async ({request}) => {
  const response = await request.post('/api/orders', {headers: {Origin: 'http://localhost:3000'}, data: {}});
  expect(response.status()).toBe(401);
});
