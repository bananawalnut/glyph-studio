#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{compile}=require('../language/compiler.cjs');
const args=process.argv.slice(2),input=args.shift();
if(!input||args.some((x,i)=>x!=='--check'&&x!=='--out-dir'&&args[i-1]!=='--out-dir')||args.includes('--out-dir')&&!args[args.indexOf('--out-dir')+1]){
  console.error('Usage: node scripts/glyphc.cjs <component.glyph.ts> [--check] [--out-dir <directory>]');process.exit(2);
}
try {
  const result=compile(fs.readFileSync(input,'utf8'),input);
  if(!result.ok){for(const d of result.diagnostics)console.error(`${input}:${d.line}:${d.column} ${d.code} ${d.message}`);process.exitCode=1;}
  else if(args.includes('--check'))console.log('Checked '+input);
  else {
    const out=path.resolve(args.includes('--out-dir')?args[args.indexOf('--out-dir')+1]:'generated'),stem=path.basename(input).replace(/(?:\.glyph)?\.ts$/,'');
    fs.mkdirSync(out,{recursive:true});
    for(const [suffix,text] of [['.mjs',result.moduleSource],['.preview.js',result.previewSource],['.manifest.json',JSON.stringify(result.manifest,null,2)+'\n']])fs.writeFileSync(path.join(out,stem+suffix),text);
    console.log('Compiled '+input+' → '+path.join(out,stem+'.mjs')+' ('+result.manifest.bytes+' bytes preview source)');
  }
} catch(error){console.error(error.code==='MODULE_NOT_FOUND'?'Install compiler dependencies with npm ci.':error.message);process.exitCode=1;}
