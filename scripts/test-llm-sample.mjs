#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const samplePath = path.join(process.cwd(), 'temp/llm-analysis-input.sample.json');
const outputPath = path.join(process.cwd(), 'temp/llm-analysis-output.sample.json');

const [{ buildThemeAnalysisInputPayloadMap }, { buildThemeAnalysisPrompt, buildFinalSummaryPrompt }, { MockGeminiAnalysisClient }] =
  await Promise.all([
    import('../src/server/analysis-input/builder.ts'),
    import('../src/server/analysis/prompt-builder.ts'),
    import('../src/server/analysis/mock-client.ts')
  ]);

const sampleInput = JSON.parse(readFileSync(samplePath, 'utf8'));
const themePayloadMap = buildThemeAnalysisInputPayloadMap(sampleInput);
const client = new MockGeminiAnalysisClient();
const model = process.env.LLM_ANALYSIS_MODEL || 'gemini-2.5-flash';

const themes = ['combat', 'economy', 'context'];
const themeResults = {};
const themePrompts = {};

for (const theme of themes) {
  const featurePayload = themePayloadMap[theme];
  const prompt = buildThemeAnalysisPrompt(featurePayload);
  const result = await client.analyzeTheme({
    theme,
    featurePayload,
    prompt,
    model
  });
  themePrompts[theme] = prompt;
  themeResults[theme] = result;
}

const finalPrompt = buildFinalSummaryPrompt({
  playerSummary: sampleInput.playerSummary,
  themeAnalyses: themeResults
});

const finalResult = await client.analyzeFinalSummary({
  playerSummary: sampleInput.playerSummary,
  themeAnalyses: themeResults,
  prompt: finalPrompt,
  model
});

const output = {
  generatedAt: new Date().toISOString(),
  model,
  inputPath: samplePath,
  promptVersion: 'analysis-prompt-v5',
  themePrompts,
  themeResults,
  finalPrompt,
  finalResult
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`[test-llm-sample] 완료: ${outputPath}`);
for (const theme of themes) {
  const response = themeResults[theme];
  console.log(`\n[${theme}] headline: ${response.headline}`);
  console.log(`[${theme}] analysisParagraph: ${response.analysisParagraph}`);
}
console.log(`\n[final] headline: ${finalResult.headline}`);
console.log(`[final] analysisParagraph: ${finalResult.analysisParagraph}`);
