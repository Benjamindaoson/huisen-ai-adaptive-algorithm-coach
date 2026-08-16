import { readdir,readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildJudgeCoverage } from './lib/judge-pack.mjs';
const root=resolve(import.meta.dirname,'..');const catalog=JSON.parse(await readFile(resolve(root,'content/index.json'),'utf8')).problems;
const dir=resolve(root,'quality/judge-packs/manifests');let names=[];try{names=(await readdir(dir)).filter((name)=>name.endsWith('.json'));}catch{}
const manifests=[];for(const name of names)manifests.push(JSON.parse(await readFile(resolve(dir,name),'utf8')));
const contents={};for(const manifest of manifests){try{contents[manifest.problemId]=JSON.parse(await readFile(resolve(root,`content/problems/${manifest.problemId}.json`),'utf8'));}catch{contents[manifest.problemId]=undefined;}}
const report={...buildJudgeCoverage(catalog,manifests,contents),generatedAt:new Date().toISOString(),manifestCount:manifests.length};await mkdir(resolve(root,'docs/quality'),{recursive:true});await writeFile(resolve(root,'docs/quality/judge-coverage.json'),`${JSON.stringify(report,null,2)}\n`);const {missing,...summary}=report;process.stdout.write(`${JSON.stringify({...summary,missingCount:missing.length,missingSample:missing.slice(0,20)},null,2)}\n`);if(process.argv.includes('--require-complete')&&!report.passed)process.exitCode=1;
