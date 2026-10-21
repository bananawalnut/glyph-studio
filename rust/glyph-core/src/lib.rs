//! Optional, allocation-free geometry compiler. No dependencies or JS bindings.
//! ABI 1: 32 f64 parameters -> interleaved f32 [x,y,z,index,u,v].
#![no_std]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { core::arch::wasm32::unreachable() }
const TAU: f64 = core::f64::consts::PI * 2.0;
static mut PARAMS: [f64; 32] = [0.0; 32];
static mut OUTPUT: [f32; 2048 * 6] = [0.0; 2048 * 6];
#[no_mangle] pub extern "C" fn abi_version() -> u32 { 1 }
#[no_mangle] pub extern "C" fn params_ptr() -> *mut f64 { core::ptr::addr_of_mut!(PARAMS).cast() }
#[no_mangle] pub extern "C" fn output_ptr() -> *mut f32 { core::ptr::addr_of_mut!(OUTPUT).cast() }
fn hash(a: u32, b: u32, c: u32) -> u32 {
    let mut x = a.wrapping_add(1).wrapping_mul(374761393) ^ b.wrapping_add(1).wrapping_mul(668265263) ^ c.wrapping_add(1).wrapping_mul(1442695041);
    x = (x ^ (x >> 13)).wrapping_mul(1274126177); x ^ (x >> 16)
}
// Bounded surface angles need no general-purpose libm. Fold to [-pi/2,pi/2]
// then use the degree-17 sine polynomial (error below 5e-14 on this interval).
// Geometry output is f32; parity tests cover all shapes and extreme counts.
fn sin(mut x: f64) -> f64 {
    let pi=core::f64::consts::PI;
    if x>pi {x-=TAU;} else if x < -pi {x+=TAU;}
    if x>pi/2.0 {x=pi-x;} else if x < -pi/2.0 {x=-pi-x;}
    let y=x*x;
    x*(1.0+y*(-1.0/6.0+y*(1.0/120.0+y*(-1.0/5040.0+y*(1.0/362880.0+y*(-1.0/39916800.0+y*(1.0/6227020800.0+y*(-1.0/1307674368000.0+y/355687428096000.0))))))))
}
fn cos(x:f64)->f64 {sin(x+core::f64::consts::PI/2.0)}
fn curve(p: &[f64], t: f64, dimensions: usize) -> [f64; 3] {
    let a = 1.0-t; let mut r = [0.0;3];
    for k in 0..dimensions { r[k]=a*a*a*p[k]+3.0*a*a*t*p[dimensions+k]+3.0*a*t*t*p[dimensions*2+k]+t*t*t*p[dimensions*3+k]; } r
}
fn surface(p: &[f64;32], u: f64, v: f64) -> [f64;3] {
    let a=u*TAU; let b=v*TAU; let r=p[3];
    match p[2] as u32 {
        0=>{ let lat=(v-0.5)*core::f64::consts::PI; [r*cos(lat)*cos(a),r*sin(lat),r*cos(lat)*sin(a)] },
        1=>[(r+p[4]*cos(b))*cos(a),p[4]*sin(b),(r+p[4]*cos(b))*sin(a)],
        2=>[r*cos(a),(v-0.5)*p[6],r*sin(a)],
        3=>[(u-0.5)*p[5],(v-0.5)*p[6],0.0],
        _=>[(u-0.5)*p[5],(v-0.5)*p[6],p[7]*0.14*sin(a)*cos(b)]
    }
}
#[no_mangle] pub extern "C" fn generate() -> u32 {
    // Copy the fixed ABI input. No references into memory survive the call.
    let p=unsafe { PARAMS }; let kind=p[0] as u32; let count=p[9] as usize;
    if kind>4 || (kind==4 && !(12..=1400).contains(&count)) || p.iter().any(|x|!x.is_finite()) { return 0; }
    let mut n=0usize;
    let mut put=|xyz:[f64;3], index:usize, u:f64, v:f64| {
        if n<2048 { unsafe { let o=core::ptr::addr_of_mut!(OUTPUT).cast::<f32>().add(n*6);for (k,x) in [xyz[0],xyz[1],xyz[2],index as f64,u,v].iter().enumerate(){o.add(k).write(*x as f32);} } n+=1; }
    };
    match kind {
        0=>for lat in 1..14 { let v=core::f64::consts::PI*lat as f64/14.0;for lon in 0..26 {let u=TAU*(lon as f64/26.0+(lat%2) as f64/52.0);put([p[3]*sin(v)*cos(u),p[3]*cos(v),p[3]*sin(v)*sin(u)],lat*26+lon,0.0,0.0);} },
        1=>for i in 0..86 {let u=i as f64/86.0;let lat=p[8]/180.0*core::f64::consts::PI;put([p[3]*cos(lat)*cos(u*TAU),p[3]*sin(lat),p[3]*cos(lat)*sin(u*TAU)],i,u,0.0);},
        2=>for i in 0..110 {let t=i as f64/109.0;put(curve(&p[12..24],t,3),i,t,0.0);},
        3=>for col in 0..40 {for row in 0..30 {put([(col as f64/39.0-0.5)*2.0,(row as f64/29.0-0.5)*2.0,0.0],col*30+row,0.0,0.0);}},
        _=>match p[1] as u32 {
            0=>{let mut rows=3usize;while ((rows as f64)+0.5)*((rows as f64)+0.5)<=count as f64/2.0 {rows+=1;}let cols=((count as f64/rows as f64+0.5) as usize).max(4);for row in 0..rows {for col in 0..cols {let u=col as f64/cols as f64;let v=(row as f64+0.5)/rows as f64;put(surface(&p,u,v),row*cols+col,u,v);}}},
            1=>for i in 0..count {let u=i as f64/count as f64;let v=(p[8]+90.0)/180.0;put(surface(&p,u,v),i,u,v);},
            2=>for i in 0..count {let u=hash(p[10] as u32,i as u32,44) as f64/4294967296.0;let v=hash(p[10] as u32,i as u32,91) as f64/4294967296.0;put(surface(&p,u,v),i,u,v);},
            _=>for i in 0..count {let t=i as f64/(count-1) as f64;let uv=curve(&p[12..20],t,2);put(surface(&p,uv[0],uv[1]),i,t,uv[1]);}
        }
    } n as u32
}
