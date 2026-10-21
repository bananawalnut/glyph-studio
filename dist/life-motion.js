/* Kinematic surrogates, not a fluid solver. All frequencies close over 24 seconds. */
(function(root){'use strict';
const T=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x);};
function jellyPulse(phase){const q=((phase*18)%1+1)%1;return smooth(0,.26,q)-smooth(.26,.86,q);}
function koiDrive(phase){const q=((phase*8)%1+1)%1;return .05+.95*smooth(0,.06,q)*(1-smooth(.32,.46,q));}
function koiTravel(phase){return phase+.65/(8*T)*(Math.sin(phase*T*8-.18*T)+Math.sin(.18*T));}
function deform(point,phase){let [x,y,z]=point;const [part,w,offset]=point.slice(9,12),aux=point[14],t=phase*T,b=t*36+point[13]*1.9;
 if(part<=4||(part>=15&&part<=19)){const local=part>=15?part-15:part,drive=part>=15?koiDrive(phase):1,u=clamp((x+1.35)/3.2);z+=drive*(.012+.19*u*u)*Math.sin(b-u*5.2);if(local===1)z+=drive*w*.10*Math.sin(b-3.8);if(local===2)z+=drive*w*.025*Math.sin(b-x*3);if(local===3)z+=w*.10*Math.sin(b*2+aux);}
 if(part===5){z+=.20*w**1.8*Math.sin(t*18+(y+.9)*T*1.3/1.92);y+=.025*w*w*Math.cos(t*18+y*4);}
 if(part===6)x+=.15*w*w*Math.sin(t*18-w*4.8);
 const pulse=jellyPulse(phase);
 if(part===7){x*=1-.18*pulse;z*=1-.18*pulse;y=.48+(y-.48)*(1+.18*pulse)+.08*pulse;}
 if(part===8){x*=1-.18*pulse*(1-w*.5);z*=1-.18*pulse*(1-w*.5);x+=.045*w*Math.sin(t*18-w*5+aux);y+=.08*pulse;}
 if(part===9){x+=.11*w*Math.sin(t*18-w*7+aux);z+=.08*w*Math.cos(t*18-w*6+aux);y+=.08*pulse*(1-w*.5);}
 if(part===11){const side=aux,s=t*48-w*1.1,angle=.90*Math.sin(s);x=side*(.18+(Math.abs(x)-.18)*Math.cos(angle));z+=Math.abs(point[0]-.18*side)*Math.sin(angle);y+=.15*w*Math.sin(s*2);}
 if(part===10||part===12||part===13)x+=.026*Math.sin(t*12-y*2)*clamp(-y);
 if(part===20){const a=Math.atan2(y+.01,x-.29);z+=w**1.5*(.19*Math.sin(t*24-w*4+a*2)+.055*Math.sin(t*24+a*9));y+=.035*w*w*Math.sin(t*24+a*4);}
 if(part===21){z+=w*.12*Math.sin(t*24-x*4+(aux===2?0:1.2));y+=(aux===2?1:-1)*w*.025*Math.sin(t*24+x*5);}
 if(part===22)z+=.10*w*Math.sin(t*24+y*4);
 if(part===24){z+=.16*w*Math.sin(t*48);y+=.04*w*Math.cos(t*48);}
 if(part>=20){const u=clamp((point[0]+1.7)/3.8);z+=(.012+.10*u*u)*Math.sin(t*24-u*4);}
 return [x,y,z];
}
// A closed cubic B-spline. Its derivative determines the direction of travel.
const PATH=[[-1.05,.30],[-.45,.65],[.85,.44],[1.03,-.22],[.13,-.62],[-.95,-.37]];
function path(phase){const q=((phase%1)+1)%1*PATH.length,k=Math.floor(q),t=q-k,s=1-t,p=[-1,0,1,2].map(i=>PATH[(k+i+PATH.length)%PATH.length]),b=[s*s*s/6,(3*t*t*t-6*t*t+4)/6,(-3*t*t*t+3*t*t+3*t+1)/6,t*t*t/6],d=[-s*s/2,1.5*t*t-2*t,-1.5*t*t+t+.5,t*t/2];return {position:[0,1].map(a=>p.reduce((v,x,i)=>v+x[a]*b[i],0)),direction:[0,1].map(a=>p.reduce((v,x,i)=>v+x[a]*d[i],0))};}
const GLSL=`
float pulse(float phase){float q=fract(phase*18.);return smoothstep(0.,.26,q)-smoothstep(.26,.86,q);}
float koiDrive(float phase){float q=fract(phase*8.);return .05+.95*smoothstep(0.,.06,q)*(1.-smoothstep(.32,.46,q));}
vec3 animalDeform(vec3 p,float part,float w,float aux,float group){float t=u_phase*T,b=t*36.+group*1.9;
 if(part<=4.||(part>=15.&&part<=19.)){float localPart=part>=15.?part-15.:part,drive=part>=15.?koiDrive(u_phase):1.,u=clamp((p.x+1.35)/3.2,0.,1.);p.z+=drive*(.012+.19*u*u)*sin(b-u*5.2);if(localPart==1.)p.z+=drive*w*.10*sin(b-3.8);if(localPart==2.)p.z+=drive*w*.025*sin(b-p.x*3.);if(localPart==3.)p.z+=w*.10*sin(b*2.+aux);}
 if(part==5.){p.z+=.20*pow(w,1.8)*sin(t*18.+(p.y+.9)*T*1.3/1.92);p.y+=.025*w*w*cos(t*18.+p.y*4.);}
 if(part==6.)p.x+=.15*w*w*sin(t*18.-w*4.8);
 float beat=pulse(u_phase);
 if(part==7.){p.xz*=1.-.18*beat;p.y=.48+(p.y-.48)*(1.+.18*beat)+.08*beat;}
 if(part==8.){p.xz*=1.-.18*beat*(1.-w*.5);p.x+=.045*w*sin(t*18.-w*5.+aux);p.y+=.08*beat;}
 if(part==9.){p.x+=.11*w*sin(t*18.-w*7.+aux);p.z+=.08*w*cos(t*18.-w*6.+aux);p.y+=.08*beat*(1.-w*.5);}
 if(part==11.){float s=t*48.-w*1.1,angle=.90*sin(s);float reach=abs(p.x)-.18;p.x=aux*(.18+reach*cos(angle));p.z+=reach*sin(angle);p.y+=.15*w*sin(s*2.);}
 if(part==10.||part==12.||part==13.)p.x+=.026*sin(t*12.-p.y*2.)*clamp(-p.y,0.,1.);
 if(part==20.){float a=atan(p.y+.01,p.x-.29);p.z+=pow(w,1.5)*(.19*sin(t*24.-w*4.+a*2.)+.055*sin(t*24.+a*9.));p.y+=.035*w*w*sin(t*24.+a*4.);}
 if(part==21.){p.z+=w*.12*sin(t*24.-p.x*4.+(aux==2.?0.:1.2));p.y+=(aux==2.?1.:-1.)*w*.025*sin(t*24.+p.x*5.);}
 if(part==22.)p.z+=.10*w*sin(t*24.+p.y*4.);
 if(part==24.){p.z+=.16*w*sin(t*48.);p.y+=.04*w*cos(t*48.);}
 if(part>=20.){float u=clamp((p.x+1.7)/3.8,0.,1.);p.z+=(.012+.10*u*u)*sin(t*24.-u*4.);}
 return p;}
`;
const api={deform,jellyPulse,koiDrive,koiTravel,path,GLSL,LOOP_SECONDS:24};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AnimalMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
