# playwright-bdd

This package is a thin layer betwwen [Playwright](https://playwright.dev/) and [Cucumber-js](https://github.com/cucumber/cucumber-js).
It allows to run [Gherkin](https://docs.cucumber.io/docs/gherkin/reference/) BDD tests via Playwright test runner.

> Inspired by issue in Playwright repo [microsoft/playwright#11975](https://github.com/microsoft/playwright/issues/11975)

## Contents

<!-- toc -->

- [How it works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [Debugging](#debugging)
- [VS Code Integration](#vs-code-integration)
- [Limitations](#limitations)
- [Feedback](#feedback)
- [License](#license)

<!-- tocstop -->

## How it works

There are 2 phases:

#### Phase 1: Generate Playwright tests from Gherkin features
CLI command `bddgen` reads features using Cucumber config and generates Playwright tests in `.features-gen` directory

<details>
<summary>Example of generated test</summary>

  Gherkin feature:
  ```gherkin
  Feature: Playwright site

  Scenario: Check title
      Given I open url "https://playwright.dev"
      When I click link "Get started"
      Then I see in title "Playwright"
  ```

  Generated test:
  ```js
  import { test } from 'playwright-bdd';

  test.describe('Playwright site', () => {

    test('Check title', async ({ Given, When, Then }) => {
      await Given('I open url "https://playwright.dev"');
      await When('I click link "Get started"');
      await Then('I see in title "Playwright"');
    });

  });    
  ```
</details>

#### Phase 2: Run generated tests with Playwright runner
Playwright runner grabs generated tests from `.features-gen` and executes them as usual. For each test `playwright-bdd` creates isolated Cucumber World and passes it to step definitions. This allows to use Playwright objects (e.g. [`page`](https://playwright.dev/docs/api/class-page)) in Cucumber steps:

<details>
<summary>Example of step definition</summary>

  ```ts
  import { expect } from '@playwright/test';
  import { Given, When, Then } from '@cucumber/cucumber';
  import { World } from 'playwright-bdd';

  Given('I open url {string}', async function (this: World, url: string) {
    await this.page.goto(url);
  });

  When('I click link {string}', async function (this: World, name: string) {
    await this.page.getByRole('link', { name }).click();
  });

  Then('I see in title {string}', async function (this: World, keyword: string) {
    await expect(this.page).toHaveTitle(new RegExp(keyword));
  });  
  ```
</details>

**Finally the command to run BDD tests (phase 1 + phase 2):**
```
npx bddgen && npx playwright test
```

## Installation

Install from npm:

```
npm i -D playwright-bdd
```

This package uses `@playwright/test` and `@cucumber/cucumber` as peer dependencies, so you may need to install them as well:

```
npm i -D @playwright/test @cucumber/cucumber
```

After installing Playwright you may need to [install browsers](https://playwright.dev/docs/browsers):

```
npx playwright install
```

## Usage

1. Create [Gherkin](https://docs.cucumber.io/docs/gherkin/reference/) tests in `features/*.feature` files:

   ```gherkin
   Feature: Playwright site

       Scenario: Check title
           Given I open url "https://playwright.dev"
           When I click link "Get started"
           Then I see in title "Playwright"
   ```

2. Create step definitions in `features/steps/*.{ts,js}` files. Use `World` from `playwright-bdd`:

   ```ts
   import { expect } from '@playwright/test';
   import { Given, When, Then } from '@cucumber/cucumber';
   import { World } from 'playwright-bdd';

   Given('I open url {string}', async function (this: World, url: string) {
     await this.page.goto(url);
   });

   When('I click link {string}', async function (this: World, name: string) {
     await this.page.getByRole('link', { name }).click();
   });

   Then(
     'I see in title {string}',
     async function (this: World, keyword: string) {
       await expect(this.page).toHaveTitle(new RegExp(keyword));
     }
   );
   ```

3. Create [Cucumber config file](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md) `cucumber.cjs`:

   ```js
   module.exports = {
     default: {
       require: ['features/steps/**'],
       // uncomment if using TypeScript
       // requireModule: ['ts-node/register'],
     },
   };
   ```

   Or in ESM format `cucumber.mjs`:

   ```js
   export default {
     import: ['features/steps/**'],
     // uncomment if using TypeScript
     // requireModule: ['ts-node/register'],
   };
   ```

4. Create [Playwright config file](https://playwright.dev/docs/test-configuration) file `playwright.config.ts`. Set `testDir` pointing to `.features-gen` directory. That directory does not exist yet but will be created during tests generation:

   ```ts
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: '.features-gen', // <- generated BDD tests
     projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
   });
   ```

5. Run tests:

   ```
   npx bddgen && npx playwright test
   ```

   Output:

   ```
   Running 1 test using 1 worker
   1 passed (2.0s)

   To open last HTML report run:

   npx playwright show-report
   ```

## Examples

Please checkout these examples depending on your project setup (ESM/CJS and TS/JS):

- [ESM + TypeScript](https://github.com/vitalets/playwright-bdd/tree/main/examples/esm-ts)
- [CJS + TypeScript](https://github.com/vitalets/playwright-bdd/tree/main/examples/cjs-ts)
- [ESM](https://github.com/vitalets/playwright-bdd/tree/main/examples/esm)
- [CJS](https://github.com/vitalets/playwright-bdd/tree/main/examples/cjs)

## Debugging

You can debug tests as usual with `--debug` flag:

```
npx bddgen && npx playwright test --debug
```

## VS Code Integration

* [Playwright extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) works as usual. You can run/debug tests in `.features-gen` directory:
  <img width="70%" src="https://user-images.githubusercontent.com/1473072/229162634-8a801f6e-8a79-407b-889b-7769f957896a.png">

* [Cucumber autocompletion](https://marketplace.visualstudio.com/items?itemName=alexkrechik.cucumberautocomplete) works as usual:
  <img width="70%" src="https://user-images.githubusercontent.com/1473072/229165348-eae41fb8-0918-48ac-8644-c55a880860de.png">

## Limitations

Currently there are some limitations:

* Cucumber hooks do not run (use Playwright hooks instead?)
* Cucumber World parameters not passed

## Feedback
Feel free to share your feedback in [issues](https://github.com/vitalets/playwright-bdd/issues). 

## License
MIT
