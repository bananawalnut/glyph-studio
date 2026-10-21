'use strict';
const A=require('node:assert/strict'),C=require('./player/flow-core.js');
const item={type:'object',properties:{id:{type:'string',minLength:1},value:{type:'number',minimum:0}},required:['id','value'],additionalProperties:false},schema=C.contract({type:'array',items:item,maxItems:5});
const payload=[{id:'one',value:3}];const d=C.definition({input:schema,output:schema,initial:[],reduce:(state,input)=>[...state,...input],organize:(state,b)=>state.map((x,i)=>({id:x.id,x:i*12,y:b.height/2,z:0,label:x.id}))});
const next=C.reduce(d,[],payload);payload[0].value=90;A.equal(next[0].value,3);A(Object.isFrozen(next[0]));A.deepEqual(C.output(d,next),next);A.equal(C.organized(d,next,{width:200,height:100})[0].y,50);
for(const bad of [[{id:'one',value:-1}],[{id:'one',value:'3'}],[{id:'one',value:3,extra:true}],[{value:3}]])A.throws(()=>C.validate(schema,bad),e=>e.code==='contract_mismatch');
for(const bad of [NaN,Infinity,undefined,()=>{},new Date(),JSON.parse('{"__proto__":1}')])A.throws(()=>C.json(bad));const cycle={};cycle.self=cycle;A.throws(()=>C.json(cycle));A.throws(()=>C.json('a'.repeat(65537)));
A.throws(()=>C.contract({type:'array',items:{type:'string'},maxItems:-1}));A.throws(()=>C.contract({type:'string',pattern:'x'}));A.throws(()=>C.contract({type:'object',properties:{}}));A.throws(()=>C.contract({type:'number',minimum:3,maximum:2}));
A.throws(()=>C.reduce({...d,reduce:(s)=>{s.push({id:'mutation',value:0});return s;}},next,[]));A.throws(()=>C.organized({...d,organize:()=>[{x:NaN,y:0,label:'bad'}]},[],{}));
const start={x:0,y:50,vx:0,vy:0},end={x:240,y:50},obstacles=[{x:95,y:15,width:40,height:70}];const path=C.route(start,end,obstacles,12);A(path.length>2);for(let i=1;i<path.length;i++)A(!C.crosses(path[i-1],path[i],{x:83,y:3,width:64,height:94}));
function run(target=()=>end){let p={...start},steps=0;const history=[];for(;steps<2400&&!p.arrived;steps++){const before=p;p=C.step(p,target(steps),obstacles,1/120);A([p.x,p.y,p.vx,p.vy].every(Number.isFinite));A(!C.crosses(before,p,{x:83,y:3,width:64,height:94}));history.push([p.x,p.y]);}A(p.arrived,'Flight must reach its target around an obstacle');return history;}
A.deepEqual(run(),run());run(i=>({x:240,y:50+Math.sin(i/120)*14}));A.equal(C.step(start,end,[{x:-10,y:0,width:300,height:100}],1/120).blocked,true);A.throws(()=>C.step(start,end,[],1));
console.log('PASS bounded input/output contracts, immutable pure reducers/layouts, invalid data/schema rejection, deterministic obstacle routing and moving-target arrival');
