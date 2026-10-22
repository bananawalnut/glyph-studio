/** Glyph authoring vocabulary. TypeScript checks code; Flow contracts check runtime data. */
export type JSON = null | boolean | number | string | JSON[] | {[key:string]:JSON};
export interface Contract<T> { readonly type:string; readonly __value?:T }
export type Infer<C> = C extends Contract<infer T> ? T : never;
type NumericBounds = {minimum?:number; maximum?:number};
type StringBounds = {minLength?:number; maxLength?:number};
export const schema: {
  number(bounds?:NumericBounds):Contract<number>;
  integer(bounds?:NumericBounds):Contract<number>;
  string(bounds?:StringBounds):Contract<string>;
  boolean():Contract<boolean>;
  null():Contract<null>;
  enum<const T extends readonly [string,...string[]] | readonly [number,...number[]] | readonly [boolean,...boolean[]]>(...values:T):Contract<T[number]>;
  array<T>(items:Contract<T>, bounds?:{minItems?:number;maxItems?:number}):Contract<T[]>;
  object<P extends Record<string,Contract<unknown>>>(properties:P):Contract<{[K in keyof P]:Infer<P[K]>}>;
};
export type DeepReadonly<T> = T extends readonly (infer V)[] ? readonly DeepReadonly<V>[] : T extends object ? {readonly [K in keyof T]:DeepReadonly<T[K]>} : T;
export interface Interaction {travel?:'stream'|'hop';receive?:'none'|'pixel-sort'|'categorize';duration?:number;textField?:string|null}
export interface Method<S,I,O> {
  input:Contract<I>;output:Contract<O>;
  handle:(state:DeepReadonly<S>, input:DeepReadonly<I>)=>{state:S;result:O};
  description?:string;interaction?:Interaction;
}
// Keep payload/result inference per method while fixing one component state type.
export function methods<S>():<I,O>(input:Contract<I>,output:Contract<O>,handle:Method<S,I,O>['handle'],options?:{description?:string;interaction?:Interaction})=>Method<S,I,O>;
export type Vec2 = readonly [number,number];
export type Vec3 = readonly [number,number,number];
export type Mat4 = readonly number[];
export interface Context {readonly phase:number;readonly time:number;readonly duration:number;readonly seed:number;readonly params:Readonly<Record<string,JSON>>;random(key:string|number):number}
export type Transform = Mat4 | ((context:Context)=>Mat4);
export interface Surface {
  at(u:number,v:number,context?:Context):number[];
  derivative(axis:'u'|'v',u:number,v:number,context?:Context,epsilon?:number):number[];
  normal(u:number,v:number,context?:Context):number[];
}
export interface Path {at(t:number,context?:Context):number[];tangent(t:number,context?:Context):number[];on(surface:Surface):Path}
export interface BufferGeometry {readonly count:number}
export interface Layer {readonly id:string}
export interface Composite {readonly children:readonly (Layer|Composite)[]}
export interface LayerOptions {
  count?:number;rows?:number;columns?:number;transform?:Transform;
  deform?:(point:Readonly<number[]>,context:Context & {u:number;v:number;index:number})=>Vec3;
  color?:string;opacity?:number;size?:number;text?:string;characters?:string;mode?:'hold'|'flicker'|'stream';rate?:number;dynamic?:boolean;
}
export interface Frame {descriptor:unknown;buffers:Map<string,Float32Array>;context:Context}
export interface Program {
  readonly params:Readonly<Record<string,JSON>>;
  sample(phase:number):Frame;
  setParams(params:Record<string,JSON>):this;
  at(layer:string,u:number,v?:number,phase?:number):number[];
  snapshot(phase?:number):unknown;
  audit(options?:{frames?:number}):{valid:boolean;frames:number;points:number;maxRadius:number;note:string};
}
export interface ProgramAPI {
  Surface:new (evaluate:(u:number,v:number,context:Context)=>Vec3,options?:{u?:Vec2;v?:Vec2;wrapU?:boolean;wrapV?:boolean;du?:(u:number,v:number,c:Context)=>Vec3;dv?:(u:number,v:number,c:Context)=>Vec3})=>Surface;
  Path:new (evaluate:(t:number,context:Context)=>Vec2|Vec3,options?:{domain?:Vec2;closed?:boolean;dimensions?:2|3;tangent?:(t:number,c:Context)=>Vec2|Vec3})=>Path;
  BufferGeometry:new (count:number,write:(out:Float32Array,context:Context)=>void)=>BufferGeometry;
  Layer:new (id:string,geometry:Surface|Path|BufferGeometry,options?:LayerOptions)=>Layer;
  Composite:new (children:(Layer|Composite)[],options?:{transform?:Transform})=>Composite;
  Program:new (options:{root:Layer|Composite;duration?:number;fps?:number;seed?:number;params?:Record<string,JSON>;camera?:{yaw?:number;pitch?:number;distance?:number};maxPoints?:number})=>Program;
  cubic(points:readonly (Vec2|Vec3)[]):Path;
  math:{
    TAU:number;add(a:readonly number[],b:readonly number[]):number[];sub(a:readonly number[],b:readonly number[]):number[];
    scale(a:readonly number[],scale:number):number[];dot(a:readonly number[],b:readonly number[]):number;
    cross(a:readonly number[],b:readonly number[]):Vec3;normalize(a:readonly number[]):number[];
    identity():Mat4;multiply(a:Mat4,b:Mat4):Mat4;translate(x:number,y:number,z:number):Mat4;rotateY(angle:number):Mat4;
    point(matrix:Mat4,point:readonly number[]):Vec3;random(seed:number,key?:string|number):number;
  };
}
export interface Mark {id:string;label:string;x:number;y:number;z?:number;color?:string;owner?:string;interactive?:boolean;accessibleLabel?:string;hitLabel?:string;letter?:number}
export interface Motion {type?:'linear'|'weave'|'custom';duration?:number;sample?:(from:Readonly<Mark>,to:Readonly<Mark>,context:{progress:number;seed:number})=>{x:number;y:number;z?:number}}
export interface ComponentSpec<P,S> {
  state:Contract<S>;initial:(props:DeepReadonly<P>)=>S;
  // Each entry retains its own input/result types through methods<State>().
  methods:Record<string,Method<S,any,any>>;
  organize:(state:DeepReadonly<S>,bounds:Readonly<{width:number;height:number}>)=>Mark[];
  motion?:Motion;
  params?:(state:DeepReadonly<S>,props:DeepReadonly<P>)=>Record<string,JSON>;
}
export interface GlyphSpec<P extends object,S> {
  name:string;description:string;atomic?:'atom'|'molecule'|'organism'|'template'|'page';
  props:Contract<P>;defaults:P;
  build:(A:ProgramAPI,props:DeepReadonly<P>)=>Program;
  component?:ComponentSpec<P,S>;
}
export interface GlyphDefinition<P extends object,S> {instantiate(A:ProgramAPI,F:unknown,props?:Partial<P>):{program:Program;component?:unknown;params?:(state:S)=>Record<string,JSON>;metadata:{name:string;description:string;atomic?:string};props:P}}
export function defineGlyph<P extends object,S = never>(spec:GlyphSpec<P,S>):GlyphDefinition<P,S>;
