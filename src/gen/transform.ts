/**
 * Transform Gherkin pickles into playwright suites
 */
import {
  Pickle,
  PickleStep,
  PickleStepType,
  PickleStepArgument,
  GherkinDocument,
} from '@cucumber/messages';
import { PickleWithDocument } from '@cucumber/cucumber/lib/api/gherkin';

export type PWSuite = {
  uri: string;
  name: string;
  tests: Map<string, PWTest>;
};

export type PWTest = {
  name: string;
  steps: PWStep[];
};

export type PWStep = {
  text: string;
  type?: PickleStepType;
  argument?: PickleStepArgument;
};

export class Transformer {
  suites = new Map<string, PWSuite>();

  constructor(private pickles: PickleWithDocument[]) {}

  run() {
    for (const { pickle, gherkinDocument } of this.pickles) {
      const suite = this.getSuite(gherkinDocument);
      const test = this.getTest(suite, pickle);
      suite.tests.set(test.name, test);
    }
    return Array.from(this.suites.values());
  }

  private getSuite(gherkinDocument: GherkinDocument) {
    const uri = gherkinDocument.uri;
    if (!uri)
      throw new Error(`Empty uri for document: ${gherkinDocument.feature}`);
    let suite = this.suites.get(uri);
    if (!suite) {
      suite = {
        uri,
        name: gherkinDocument.feature?.name || 'Unknown feature',
        tests: new Map(),
      };
      this.suites.set(uri, suite);
    }
    return suite;
  }

  private getTest(suite: PWSuite, pickle: Pickle) {
    const name = this.getTestName(suite, pickle.name);
    const steps = pickle.steps.map((step) => this.getStep(step));
    return { name, steps };
  }

  private getStep({ type, text, argument }: PickleStep) {
    return { type, text, argument };
  }

  /**
   * Playwirght does not allow tests with the same name,
   * but gherkin can generate ones (for outline scenarios).
   */
  private getTestName(suite: PWSuite, initialName: string) {
    let name = initialName;
    let index = 0;
    while (suite.tests.has(name)) name = `${name} (${++index})`;
    return name;
  }
}
