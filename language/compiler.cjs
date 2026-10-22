'use strict';
// Type-check/emit only. Author modules are never imported or evaluated by this process.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function compile(source, filename='component.glyph.ts') {
  if(typeof source!=='string'||!source.trim()||Buffer.byteLength(source)>64000)
    return {ok:false,diagnostics:[{code:'source_limit',line:1,column:1,message:'Use TypeScript source between 1 and 64000 bytes.'}]};
  const ts=require('typescript'),entry='/__glyph__/component.glyph.ts',author='/__glyph__/author.d.ts';
  const ast=ts.createSourceFile(entry,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS),diagnostics=[];
  const report=(node,message)=>{const p=ast.getLineAndCharacterOfPosition(node.getStart(ast));diagnostics.push({code:'module_boundary',line:p.line+1,column:p.character+1,message});};
  if(ast.referencedFiles.length||ast.typeReferenceDirectives.length||ast.libReferenceDirectives.length)
    diagnostics.push({code:'module_boundary',line:1,column:1,message:'Reference directives are not supported. The compiler supplies ES2022 and @glyph/author.'});
  let defaults=0;
  function visit(n){
    if(ts.isImportDeclaration(n)&&(!ts.isStringLiteral(n.moduleSpecifier)||n.moduleSpecifier.text!=='@glyph/author'))report(n,'Self-contained components may import only @glyph/author.');
    if(ts.isImportEqualsDeclaration(n)||ts.isExportDeclaration(n)&&n.moduleSpecifier)report(n,'External modules are not supported in portable components.');
    if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(n.expression)&&n.expression.text==='require'))report(n,'Dynamic imports and require are not supported.');
    if(ts.isMetaProperty(n))report(n,'Module metadata is not available in a self-contained component.');
    if(ts.isExportAssignment(n)){defaults++;if(n.isExportEquals)report(n,'Use export default defineGlyph(...).');}
    ts.forEachChild(n,visit);
  }
  visit(ast);
  if(defaults!==1)diagnostics.push({code:'module_boundary',line:1,column:1,message:'Export one default Glyph definition, for example export default defineGlyph({...}).'});
  if(diagnostics.length)return {ok:false,diagnostics};
  const options={strict:true,noEmitOnError:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,moduleResolution:ts.ModuleResolutionKind.Node10,
    lib:['lib.es2022.d.ts'],types:[],skipLibCheck:false,removeComments:true,ignoreDeprecations:'6.0'};
  const base=ts.createCompilerHost(options),lib=path.dirname(ts.getDefaultLibFilePath(options)),outputs=new Map();
  const allowed=p=>p===entry||p===author||path.dirname(path.resolve(p))===lib&&path.basename(p).startsWith('lib.')&&p.endsWith('.d.ts');
  const read=p=>p===entry?source:p===author?fs.readFileSync(path.join(__dirname,'author.d.ts'),'utf8'):allowed(p)?base.readFile(p):undefined;
  const host={...base,readFile:read,fileExists:p=>p===entry||p===author||allowed(p)&&base.fileExists(p),
    getSourceFile:(p,version)=>{const text=read(p);return text===undefined?undefined:ts.createSourceFile(p,text,version,true);},
    resolveModuleNames:names=>names.map(n=>n==='@glyph/author'?{resolvedFileName:author,extension:ts.Extension.Dts}:undefined),
    writeFile:(name,text)=>outputs.set(name,text)};
  const program=ts.createProgram([entry],options,host);
  for(const d of ts.getPreEmitDiagnostics(program)){
    const p=d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start):{line:0,character:0};
    diagnostics.push({code:'TS'+d.code,line:p.line+1,column:p.character+1,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')});
  }
  const checkedSource=program.getSourceFile(entry),checker=program.getTypeChecker();
  const exported=checkedSource.statements.find(ts.isExportAssignment);
  if(exported){
    const definition=checker.getTypeAtLocation(exported.expression),instantiate=checker.getPropertyOfType(definition,'instantiate');
    if(!instantiate || !checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(instantiate,exported),ts.SignatureKind.Call).length){
      const p=checkedSource.getLineAndCharacterOfPosition(exported.getStart(checkedSource));
      diagnostics.push({code:'default_definition',line:p.line+1,column:p.character+1,message:'Default export must be a Glyph definition with instantiate(A,F,props), usually defineGlyph(...).'});
    }
  }
  if(diagnostics.length)return {ok:false,diagnostics};
  program.emit();
  const emitted=[...outputs].find(([p])=>p.endsWith('/component.glyph.js'))?.[1];
  if(!emitted)return {ok:false,diagnostics:[{code:'emit_failed',line:1,column:1,message:'TypeScript did not emit the component.'}]};
  const helper=fs.readFileSync(path.join(__dirname,'author-runtime.js'),'utf8').split("if (typeof module !== 'undefined'")[0];
  const hash=crypto.createHash('sha256').update(source).digest('hex');
  const previewSource='// Glyph TypeScript → JavaScript. Source SHA256: '+hash+'\nfunction create(A, F, props) {\n"use strict";\n'+helper+
    '\nconst author = glyphAuthorRuntime(), module = {exports:{}};\n(function(exports, require) {\n'+emitted+
    '\n})(module.exports, name => {if(name !== "@glyph/author") throw Error("Unknown authoring module"); return author;});\n'+
    'const definition = module.exports.default;\nif (!definition || typeof definition.instantiate !== "function") throw Error("Default export must be defineGlyph(...)");\nreturn definition.instantiate(A, F, props);\n}\n';
  if(Buffer.byteLength(previewSource)>64000)return {ok:false,diagnostics:[{code:'output_limit',line:1,column:1,message:'Compiled component exceeds the studio 64 KB source limit.'}]};
  return {ok:true,diagnostics:[],previewSource,moduleSource:previewSource+'\nexport { create };\n',manifest:{version:1,kind:'glyph-compiled-component',language:'typescript',typescript:ts.version,
    sourceFile:path.basename(filename),sourceHash:hash,target:'glyph-program/create-v1',runtime:['glyph-program','glyph-flow-core'],bytes:Buffer.byteLength(previewSource)}};
}
module.exports={compile};
