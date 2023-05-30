/**
 * Generate test code.
 */
import {
  GherkinDocument,
  FeatureChild,
  RuleChild,
  Scenario,
  Background,
  Step,
  PickleStep,
  Pickle,
  Feature,
  Rule,
  Examples,
} from '@cucumber/messages';
import fs from 'node:fs';
import path from 'node:path';
import * as formatter from './formatter';
import { KeywordsMap, getKeywordsMap } from './i18n';
import { ISupportCodeLibrary } from '@cucumber/cucumber/lib/support_code_library_builder/types';
import { findStepDefinition } from '../cucumber/loadSteps';
import StepDefinition from '@cucumber/cucumber/lib/models/step_definition';
import { stepFixtureNames } from '../run/createBDD';

export type TestFileOptions = {
  doc: GherkinDocument;
  pickles: Pickle[];
  supportCodeLibrary: ISupportCodeLibrary;
  outputDir: string;
  importTestFrom: formatter.ImportTestFrom;
};

export class TestFile {
  private lines: string[] = [];
  private keywordsMap?: KeywordsMap;

  constructor(private options: TestFileOptions) {}

  get content() {
    return this.lines.join('\n');
  }

  get language() {
    return this.options.doc.feature?.language || 'en';
  }

  get outputPath() {
    return path.join(this.options.outputDir, `${this.options.doc.uri}.spec.js`);
  }

  build() {
    this.loadI18nKeywords();
    this.lines = [
      ...this.getFileHeader(), // prettier-ignore
      ...this.getRootSuite(),
    ];
    return this;
  }

  save() {
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.outputPath, this.content);
  }

  private getFileHeader() {
    const importTestFrom = this.getRelativeImportTestFrom();
    return formatter.fileHeader(this.options.doc.uri || '', importTestFrom);
  }

  private loadI18nKeywords() {
    if (this.language !== 'en') {
      this.keywordsMap = getKeywordsMap(this.language);
    }
  }

  private getRelativeImportTestFrom() {
    let {
      importTestFrom: { file, varName },
    } = this.options;
    if (path.isAbsolute(file)) {
      const dir = path.dirname(this.outputPath);
      file = path.relative(dir, file);
    }
    return {
      file,
      varName,
    };
  }

  private getRootSuite() {
    if (!this.options.doc.feature) throw new Error(`Document without feature.`);
    return this.getSuite(this.options.doc.feature);
  }

  private getSuite(feature: Feature | Rule) {
    const tags = getTagNames(feature);
    const lines: string[] = [];
    feature.children.forEach((child) => lines.push(...this.getSuiteChild(child)));
    return formatter.suite(tags, feature.name, lines);
  }

  private getSuiteChild(child: FeatureChild | RuleChild) {
    if ('rule' in child && child.rule) return this.getSuite(child.rule);
    const { background, scenario } = child;
    if (background) return this.getBeforeEach(background);
    if (scenario) return this.getScenarioLines(scenario);
    throw new Error(`Empty child: ${JSON.stringify(child)}`);
  }

  private getScenarioLines(scenario: Scenario) {
    return isOutline(scenario) ? this.getOutlineSuite(scenario) : this.getTest(scenario);
  }

  private getBeforeEach(bg: Background) {
    const { fixtures, lines } = this.getSteps(bg);
    return formatter.beforeEach(fixtures, lines);
  }

  private getOutlineSuite(scenario: Scenario) {
    const suiteLines: string[] = [];
    const suiteTags = getTagNames(scenario);
    let exampleIndex = 0;
    scenario.examples.forEach((example) => {
      const tags = getTagNames(example);
      example.tableBody.forEach((exampleRow) => {
        const title = `Example #${++exampleIndex}`;
        const { fixtures, lines } = this.getSteps(scenario, exampleRow.id);
        const testLines = formatter.test(tags, title, fixtures, lines);
        suiteLines.push(...testLines);
      });
    });
    return formatter.suite(suiteTags, scenario.name, suiteLines);
  }

  private getTest(scenario: Scenario) {
    const tags = getTagNames(scenario);
    const { fixtures, lines } = this.getSteps(scenario);
    return formatter.test(tags, scenario.name, fixtures, lines);
  }

  private getSteps(scenario: Scenario | Background, outlineExampleRowId?: string) {
    const fixtures = new Set<string>();
    const lines = scenario.steps.map((step) => {
      const pickleStep = this.getPickleStep(step, outlineExampleRowId);
      const stepDefinition = findStepDefinition(this.options.supportCodeLibrary, pickleStep.text);
      const { keyword, fixtures: stepFixtures, line } = this.getStep(step, pickleStep, stepDefinition);
      fixtures.add(keyword);
      stepFixtures.forEach((fixture) => fixtures.add(fixture));
      return line;
    });
    return { fixtures, lines };
  }

  private getStep(step: Step, { text, argument }: PickleStep, { code }: StepDefinition) {
    const keyword = this.getKeyword(step);
    const fixtures = stepFixtureNames.get(code) || [];
    const line = formatter.step(keyword, text, argument, fixtures);
    return { keyword, fixtures, line };
  }

  private getPickleStep(step: Step, outlineExampleRowId?: string) {
    for (const pickle of this.options.pickles) {
      const pickleStep = pickle.steps.find(({ astNodeIds }) => {
        const hasStepId = astNodeIds.includes(step.id);
        const hasRowId = !outlineExampleRowId || astNodeIds.includes(outlineExampleRowId);
        return hasStepId && hasRowId;
      });
      if (pickleStep) return pickleStep;
    }

    throw new Error(`Pickle step not found for step: ${step.text}`);
  }

  private getKeyword(step: Step) {
    const origKeyword = step.keyword.trim();
    if (origKeyword === '*') return 'And';
    if (!this.keywordsMap) return origKeyword;
    const enKeyword = this.keywordsMap.get(origKeyword);
    if (!enKeyword) throw new Error(`Keyword not found: ${origKeyword}`);
    return enKeyword;
  }
}

function getTagNames(item: Feature | Rule | Scenario | Examples) {
  return item.tags.map((tag) => tag.name);
}

function isOutline(scenario: Scenario) {
  return scenario.keyword === 'Scenario Outline' || scenario.keyword === 'Scenario Template';
}