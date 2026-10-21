function create(A, F) {
  const {Surface, Path, Layer, Composite, Program, math: M} = A;
  const number = {type:'number', minimum:0, maximum:0.65};
  const shell = new Surface((u,v,{phase,params}) => {
    const r = 1 + params.amplitude * Math.sin(v)**2 * Math.cos(5*u + M.TAU*phase);
    return [r*Math.sin(v)*Math.cos(u), r*Math.cos(v), r*Math.sin(v)*Math.sin(u)];
  }, {u:[0,M.TAU], v:[0.08,Math.PI-0.08], wrapU:true});
  const signal = new Path((t,c)=>[t+c.phase*M.TAU, Math.PI/2+0.3*Math.sin(3*t)],
    {dimensions:2, domain:[0,M.TAU], closed:true}).on(shell);
  const program = new Program({duration:12, seed:42, params:{amplitude:0.22},
    root:new Composite([
      new Layer('shell',shell,{rows:26,columns:48,size:8,opacity:0.45,characters:'+.:',color:'mint'}),
      new Layer('signal',signal,{count:160,size:13,text:'FUNCTION / SIGNAL / ',color:'cyan'})
    ],{transform:c=>M.rotateY(c.phase*M.TAU)})});
  const component = {
    interface:new F.ComponentInterface({
      description:'A harmonic shell whose component state controls radial deformation.',
      state:{type:'object',properties:{amplitude:number},required:['amplitude'],additionalProperties:false},
      methods:{sculpt:{description:'Set deformation amplitude, update the organizer and return the accepted value.',input:number,output:number,
        handle:(state,value)=>({state:{...state,amplitude:value},result:value})}}
    }),
    initial:{amplitude:0.22},
    organize:(state,{width,height})=>Array.from({length:16},(_,i)=>{
      const a=i/16*M.TAU, r=45+state.amplitude*90;
      return {id:String(i),label:i%4?'·':'STATE',x:width/2+r*Math.cos(a),y:height/2+r*0.55*Math.sin(a),z:r*Math.sin(a),color:'#86d6ee'};
    }),
    motion:{type:'custom',duration:1.4,sample:(from,to,{progress:t})=>{
      const e=t*t*(3-2*t);
      return {x:from.x+(to.x-from.x)*e+Math.sin(Math.PI*t)*24,
        y:from.y+(to.y-from.y)*e,z:(from.z||0)+((to.z||0)-(from.z||0))*e};
    }}
  };
  return {program, component, params:state=>state};
}
