const assert=require('node:assert/strict');
const {generate,deform,CHARS}=require('./dist/betta-geometry.js');
const a=generate(),b=generate(),other=generate({seed:2802});
assert.deepEqual(a.data,b.data,'same seed reproduces the geometry');
assert.notDeepEqual(a.data,other.data,'seed changes the glyph field');
assert.equal(a.data.length,a.count*9);
assert.equal([...CHARS].length,8);
assert(a.count>4000&&a.count<6000);
assert(Object.keys(a.parts).length===8);
let finMotion=0,bodyMotion=0;
for(let i=0;i<a.data.length;i+=9){
 const p=a.data.subarray(i,i+9),[x,y,z,part,w,seed,alpha,side,glyph]=p;
 assert([...p].every(Number.isFinite));
 assert(Number.isInteger(part)&&part>=0&&part<=7);
 assert(w>=0&&w<=1&&seed>=0&&seed<1&&alpha>=0&&alpha<=1);
 assert(side===1||side===-1);
 assert(glyph===-1||(glyph>=0&&glyph<8));
 if(part>0){assert(x>=-1.8&&x<2.2);assert(Math.abs(y)<1.8);assert(Math.abs(z)<.4);}
 const start=deform(p,0),end=deform(p,1),later=deform(p,.2);
 assert.deepEqual(start,end,'each surface closes at the loop boundary');
 assert.deepEqual(deform(p,.25),deform(p,1.25));
 assert(later.every(Number.isFinite));
 if(part===1&&w>.8)finMotion=Math.max(finMotion,Math.abs(later[2]-start[2]));
 if(part===5)bodyMotion=Math.max(bodyMotion,Math.abs(later[2]-start[2]));
}
assert(finMotion>.1,'tail membrane ripples');
assert(bodyMotion<.08,'body moves gently instead of inheriting fin displacement');
assert(finMotion>bodyMotion*2);
for(const args of [{seed:-1},{seed:1.1},{spacing:0},{spacing:NaN},{spacing:.2}])assert.throws(()=>generate(args));
console.log(`Betta: ${a.count} reproducible glyphs; separate fin motion and exact loop closure passed.`);
