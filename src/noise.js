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
};