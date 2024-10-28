import { test as base, createBdd } from 'playwright-bdd';

const logger = console;

export const test = base.extend<object, { track: (s: string) => unknown }>({
  track: [
    async ({}, use, workerInfo) => {
      const fn = (hookTitle: string) => {
        logger.log(`worker ${workerInfo.workerIndex}: ${hookTitle}`);
        const shouldThrow = process.env.ERROR && hookTitle.startsWith(process.env.ERROR);
        if (shouldThrow) {
          throw new Error(hookTitle);
        }
      };
      await use(fn);
    },
    { scope: 'worker' },
  ],
});

export const { Given, Before, BeforeAll, After, AfterAll } = createBdd(test);