import {defineGlyph, schema as s, methods, type Infer} from '@glyph/author';

const props=s.object({radius:s.number({minimum:0.5,maximum:2})});
type Props=Infer<typeof props>;
const word=s.string({minLength:1,maxLength:18});
const state=s.object({words:s.array(word,{maxItems:12})});
type State=Infer<typeof state>;
const method=methods<State>();

export default defineGlyph<Props,State>({
  name:'Word ring',description:'A receiver-owned sorted word array with a parametric carrier ring.',atomic:'molecule',
  props,defaults:{radius:1.2},
  build(A,props){
    const ring=new A.Path((t,{phase})=>[props.radius*Math.cos(t),0.15*Math.sin(3*t+phase*A.math.TAU),props.radius*Math.sin(t)],
      {domain:[0,A.math.TAU],closed:true});
    return new A.Program({root:new A.Layer('ring',ring,{count:160,size:10,characters:'.+',color:'cyan'}),seed:42});
  },
  component:{
    state,initial:()=>({words:[]}),
    methods:{
      add:method(word,s.integer({minimum:0,maximum:11}),(state,input)=>{
        if(state.words.includes(input))throw Error('This word already exists.');
        const words=[...state.words,input].sort();
        return {state:{words},result:words.indexOf(input)};
      },{description:'Insert a unique word alphabetically and return its new index.',interaction:{travel:'hop',receive:'pixel-sort',duration:1.2}})
    },
    organize:(state,{width,height})=>state.words.map((label,index)=>{
      const angle=index/Math.max(1,state.words.length)*Math.PI*2;
      return {id:label,label,x:width/2+Math.cos(angle)*width*0.3,y:height/2+Math.sin(angle)*height*0.3,color:'#86d6ee'};
    }),
    motion:{type:'weave',duration:1.5},params:()=>({})
  }
});
