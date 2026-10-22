'use strict';
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads'),path=require('node:path');
if(!isMainThread){
  try{parentPort.postMessage(require('./compiler.cjs').compile(workerData.source,workerData.filename));}
  catch(error){parentPort.postMessage({unavailable:error.code==='MODULE_NOT_FOUND',error:'The TypeScript compiler is unavailable. Run npm ci in this checkout.'});}
} else {
  let busy=false;
  async function compileRequest(body){
    const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
    if(Object.keys(body).some(k=>!['source','filename'].includes(k))||typeof body.source!=='string'||!body.source.trim()||Buffer.byteLength(body.source)>64000||
      body.filename!==undefined&&(typeof body.filename!=='string'||!/^[-a-zA-Z0-9_.]{1,100}\.ts$/.test(body.filename)))fail(400,'invalid_source','Use source up to 64000 bytes and an optional TypeScript filename.');
    if(busy)fail(409,'compiler_busy','Another compilation is running. Try again after it finishes.');
    busy=true;
    try{return await new Promise((resolve,reject)=>{
      const worker=new Worker(path.resolve(__filename),{workerData:{source:body.source,filename:body.filename},resourceLimits:{maxOldGenerationSizeMb:128}});
      let done=false;
      function finish(error,result){if(done)return;done=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);}
      const timer=setTimeout(()=>finish(Object.assign(Error('Compilation exceeded 8 seconds.'),{status:422,code:'compile_timeout'})),8000);
      worker.once('message',result=>result.error?finish(Object.assign(Error(result.error),{status:503,code:'compiler_unavailable'})):finish(null,result));
      worker.once('error',()=>finish(Object.assign(Error('Compiler worker failed. Simplify the component and retry.'),{status:422,code:'compile_failed'})));
      worker.once('exit',()=>{if(!done)finish(Object.assign(Error('Compiler worker stopped.'),{status:422,code:'compile_failed'}));});
    });}finally{busy=false;}
  }
  module.exports={compileRequest};
}
