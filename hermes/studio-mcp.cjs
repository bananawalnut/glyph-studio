'use strict';
// A private stdio MCP facade. Its scoped tools only read and validate design data.
const fs=require('node:fs'),http=require('node:http'),readline=require('node:readline'),path=require('node:path');
const allowed=require('./designer.cjs').toolNames('codex',process.env.GLYPH_STUDIO_SCOPE);
const tools=JSON.parse(fs.readFileSync(path.join(__dirname,'..','dist','agent-tools.json'),'utf8')).filter(t=>allowed.includes(t.name)).map(t=>({name:t.name,description:t.description,inputSchema:t.parameters,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}}));
async function call(name,args){if(!allowed.includes(name))throw Error('This Codex adapter exposes read-only studio tools.');const file=process.env.GLYPH_STUDIO_CONNECTION;if(!file)throw Error('Studio connection unavailable');const stat=fs.statSync(file);if(!stat.isFile()||stat.size>8192||(process.platform!=='win32'&&(stat.mode&0o077)))throw Error('Invalid private connection');const c=JSON.parse(fs.readFileSync(file,'utf8')),url=new URL(c.url);if(c.version!==1||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||!['','/'].includes(url.pathname)||url.search||url.hash||!/^[a-f0-9]{64}$/.test(c.token))throw Error('Invalid loopback connection');
 return new Promise((resolve,reject)=>{const body=JSON.stringify({name,arguments:args||{},...(process.env.GLYPH_STUDIO_SCOPE==='preset'?{context:{scope:'preset',job_id:process.env.GLYPH_STUDIO_JOB}}:{})}),req=http.request(new URL('/api/tool',url),{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{let value='';res.on('data',chunk=>{value+=chunk;if(value.length>300000){res.destroy();reject(Error('Response too large'));}});res.on('error',reject);res.on('end',()=>{try{resolve(JSON.parse(value));}catch{reject(Error('Invalid bridge response'));}});});req.setTimeout(10000,()=>req.destroy(Error('Studio timeout')));req.on('error',reject);req.end(body);});
}
async function handle(r){if(r.id===undefined)return null;
 if(r.method==='initialize')return {protocolVersion:r.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'glyph-studio-readonly',version:'1.1.0'}};
 if(r.method==='ping')return {};
 if(r.method==='tools/list')return {tools};
 if(r.method==='tools/call'){try{const value=await call(r.params?.name,r.params?.arguments);return {content:[{type:'text',text:JSON.stringify(value)}],isError:value.ok===false};}catch{return {content:[{type:'text',text:'The requested read-only studio tool is unavailable.'}],isError:true};}}
 throw Error('Unsupported MCP method');
}
if(require.main===module){const input=readline.createInterface({input:process.stdin});input.on('line',async line=>{let r;try{if(line.length>300000)return;r=JSON.parse(line);const result=await handle(r);if(result!==null)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:r.id,result})+'\n');}catch{if(r?.id!==undefined)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:r.id,error:{code:-32601,message:'Unsupported studio request'}})+'\n');}});}
module.exports={tools,call,handle};
