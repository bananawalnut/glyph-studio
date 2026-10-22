import {defineGlyph, schema as s, methods, type Infer} from '@glyph/author';

const props = s.object({amplitude:s.number({minimum:0,maximum:0.65}), label:s.string({maxLength:40})});
type Props = Infer<typeof props>;
const state = s.object({amplitude:s.number({minimum:0,maximum:0.65})});
type State = Infer<typeof state>;
const method = methods<State>();
const strength = s.number({minimum:0,maximum:0.65});

export default defineGlyph<Props, State>({
  name:'Signal shell',
  description:'A harmonic surface and mapped signal path, with a typed deformation method.',
  atomic:'atom',
  props, defaults:{amplitude:0.22,label:'SIGNAL / '},
  build(A, props) {
    const {Surface,Path,Layer,Composite,Program,math:M} = A;
    const shell = new Surface((u,v,{phase,params}) => {
      const r = 1 + Number(params.amplitude)*Math.sin(v)**2*Math.cos(3*u+M.TAU*phase);
      return [r*Math.sin(v)*Math.cos(u),r*Math.cos(v),r*Math.sin(v)*Math.sin(u)];
    },{u:[0,M.TAU],v:[0.08,Math.PI-0.08],wrapU:true});
    const signal = new Path((t,{phase}) => [t+phase*M.TAU,Math.PI/2+0.24*Math.sin(3*t)],
      {dimensions:2,domain:[0,M.TAU],closed:true}).on(shell);
    return new Program({seed:42,duration:12,params:{amplitude:props.amplitude},root:new Composite([
      new Layer('shell',shell,{rows:26,columns:48,size:8,characters:'+.:',opacity:0.4}),
      new Layer('signal',signal,{count:160,size:13,text:props.label,color:'cyan'})
    ],{transform:({phase})=>M.rotateY(phase*M.TAU)})});
  },
  component:{
    state,initial:props=>({amplitude:props.amplitude}),
    methods:{
      sculpt:method(strength,strength,(state,amplitude)=>({state:{...state,amplitude},result:amplitude}),
        {description:'Set radial deformation between 0 and 0.65.'})
    },
    organize:(state,{width,height})=>Array.from({length:16},(_,i)=>{
      const angle=i/16*Math.PI*2,radius=40+state.amplitude*90;
      return {id:String(i),label:i%4?'·':'STATE',x:width/2+radius*Math.cos(angle),y:height/2+radius*0.5*Math.sin(angle)};
    }),
    motion:{type:'custom',duration:1.4,sample:(from,to,{progress:t})=>{
      const ease=t*t*(3-2*t);
      return {x:from.x+(to.x-from.x)*ease+Math.sin(Math.PI*t)*24,y:from.y+(to.y-from.y)*ease};
    }},
    params:state=>({amplitude:state.amplitude})
  }
});
