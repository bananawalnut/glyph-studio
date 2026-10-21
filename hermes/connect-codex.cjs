'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
let binary=arg('--binary')||process.env.GLYPH_CODEX_BINARY;
if(!binary){for(const dir of (process.env.PATH||'').split(path.delimiter)){const p=path.join(dir,process.platform==='win32'?'codex.exe':'codex');try{fs.accessSync(p,fs.constants.X_OK);binary=p;break;}catch{}}}
if(!binary){console.error('Codex CLI is unavailable. Install it, sign in, then run npm run connect:codex.');process.exit(1);}
binary=fs.realpathSync(binary);const status=spawnSync(binary,['login','status'],{encoding:'utf8',timeout:15000});if(status.status!==0){console.error('Sign in with codex login first, then run npm run connect:codex.');process.exit(1);}
const directory=path.join(__dirname,'..','.runtime');fs.mkdirSync(directory,{recursive:true,mode:0o700});fs.chmodSync(directory,0o700);const model=arg('--model');if(model&&!/^[a-zA-Z0-9._-]{1,100}$/.test(model))throw Error('Invalid model name');
fs.writeFileSync(path.join(directory,'codex.json'),JSON.stringify({binary,...(model?{model}:{}),model_label:model||'Signed-in account',enabled:true},null,2),{mode:0o600});fs.chmodSync(path.join(directory,'codex.json'),0o600);console.log('Codex connected. Choose Codex in Glyph Studio or Zenith. Local Hermes remains available.');
