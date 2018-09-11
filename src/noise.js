let d = (g,x,y,z) => g[0]*x + g[1]*y + g[2]*z; // dot
let m = (a, b, t) => (1.0-t)*a + t*b; // mix
let f = (t) => t*t*t*(t*(t*6.0-15.0)+10.0); // fade

let g = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0], 
[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1], 
[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]]; 
let p = [];
for (var i=0; i<256; i++) {
  p[i] = Math.floor(Math.abs(Math.sin(i*432.4224))*256);
}
let perm = []; 
for(var i=0; i<512; i++) {
  perm[i]=p[i & 255];
}

export default function(x, y, z) { 
  // Find unit grid cell containing point 
  var X = Math.floor(x); 
  var Y = Math.floor(y); 
  var Z = Math.floor(z); 
  
  // Get relative xyz coordinates of point within that cell 
  x = x - X; 
  y = y - Y; 
  z = z - Z; 
  
  // Wrap the integer cells at 255 (smaller integer period can be introduced here) 
  X = X & 255; 
  Y = Y & 255; 
  Z = Z & 255;

  // Compute the fade curve value for each of x, y, z 
  var u = f(x); 
  var v = f(y); 
  var w = f(z); 

  // Simplify the code. - just generate all the permutations and compute the gradient from there.
  const gx = [
    [0,0,0],
    [0,0,1],
    [0,1,0],
    [0,1,1],
    [1,0,0],
    [1,0,1],
    [1,1,0],
    [1,1,1]
  ]

  let e = gx.map(gr => {
    return d(g[perm[X+gr[0]+perm[Y+gr[1]+perm[Z+gr[2]]]] % 12], x-gr[0], y - gr[1], z - gr[2]);
  })

  // let zip = (a, vz) => {
  //   console.log('A LEN', a.length);
  //   if (a.length <= 1) {
  //     return a[0];
  //   }
  //   let x = [], u = 0;
  //   while(u < a.length/2 - 1) {
  //     x.push(this.mix(a[u], a[u+a.length/2], vz[0]));
  //     u++;
  //   }
  //   vz.shift();
  //   return zip(x, vz);
  // }
  // return zip(d, [u,v,w]);

  //  // Interpolate along x the contributions from each of the corners 
  var nx00 = m(e[0], e[4], u); 
  var nx01 = m(e[1], e[5], u); 
  var nx10 = m(e[2], e[6], u); 
  var nx11 = m(e[3], e[7], u); 
  // Interpolate the four results along y 
  var nxy0 = m(nx00, nx10, v); 
  var nxy1 = m(nx01, nx11, v); 
  // Interpolate the two last results along z 
  var nxyz = m(nxy0, nxy1, w); 

  return nxyz; 


  // Old version - working
    
  // var gi000 = this.perm[X+this.perm[Y+this.perm[Z]]] % 12; 
  // var gi001 = this.perm[X+this.perm[Y+this.perm[Z+1]]] % 12; 
  // var gi010 = this.perm[X+this.perm[Y+1+this.perm[Z]]] % 12; 
  // var gi011 = this.perm[X+this.perm[Y+1+this.perm[Z+1]]] % 12; 
  // var gi100 = this.perm[X+1+this.perm[Y+this.perm[Z]]] % 12; 
  // var gi101 = this.perm[X+1+this.perm[Y+this.perm[Z+1]]] % 12; 
  // var gi110 = this.perm[X+1+this.perm[Y+1+this.perm[Z]]] % 12; 
  // var gi111 = this.perm[X+1+this.perm[Y+1+this.perm[Z+1]]] % 12; 

  // var n000= this.dot(this.grad3[gi000], x, y, z); 
  // var n100= this.dot(this.grad3[gi100], x-1, y, z); 
  // var n010= this.dot(this.grad3[gi010], x, y-1, z); 
  // var n110= this.dot(this.grad3[gi110], x-1, y-1, z); 
  // var n001= this.dot(this.grad3[gi001], x, y, z-1); 
  // var n101= this.dot(this.grad3[gi101], x-1, y, z-1); 
  // var n011= this.dot(this.grad3[gi011], x, y-1, z-1); 
  // var n111= this.dot(this.grad3[gi111], x-1, y-1, z-1); 
  // var u = this.fade(x); 
  // var v = this.fade(y); 
  // var w = this.fade(z); 
  // var nx00 = this.mix(n000, n100, u); 
  // var nx01 = this.mix(n001, n101, u); 
  // var nx10 = this.mix(n010, n110, u); 
  // var nx11 = this.mix(n011, n111, u); 
  // var nxy0 = this.mix(nx00, nx10, v); 
  // var nxy1 = this.mix(nx01, nx11, v); 
  // var nxyz = this.mix(nxy0, nxy1, w); 

  // return nxyz; 
};