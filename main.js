!function(a,b){var l,c=eval("this"),d=256,g="random",h=b.pow(d,6),i=b.pow(2,52),j=2*i,k=d-1;function m(r,t,e){var u=[],f=q(function n(r,t){var e,o=[],i=typeof r;if(t&&"object"==i)for(e in r)try{o.push(n(r[e],t-1))}catch(n){}return o.length?o:"string"==i?r:r+"\0"}((t=1==t?{entropy:!0}:t||{}).entropy?[r,s(a)]:null==r?function(){try{var n;return l&&(n=l.randomBytes)?n=n(d):(n=new Uint8Array(d),(c.crypto||c.msCrypto).getRandomValues(n)),s(n)}catch(n){var r=c.navigator,t=r&&r.plugins;return[+new Date,c,t,c.screen,s(a)]}}():r,3),u),p=new n(u),m=function(){for(var n=p.g(6),r=h,t=0;n<i;)n=(n+t)*d,r*=d,t=p.g(1);for(;j<=n;)n/=2,r/=2,t>>>=1;return(n+t)/r};return m.int32=function(){return 0|p.g(4)},m.quick=function(){return p.g(4)/4294967296},m.double=m,q(s(p.S),a),(t.pass||e||function(n,r,t,e){return e&&(e.S&&o(e,p),n.state=function(){return o(p,{})}),t?(b[g]=n,r):n})(m,f,"global"in t?t.global:this==b,t.state)}function n(n){var r,t=n.length,u=this,e=0,o=u.i=u.j=0,i=u.S=[];for(t||(n=[t++]);e<d;)i[e]=e++;for(e=0;e<d;e++)i[e]=i[o=k&o+n[e%t]+(r=i[e])],i[o]=r;(u.g=function(n){for(var r,t=0,e=u.i,o=u.j,i=u.S;n--;)r=i[e=k&e+1],t=t*d+i[k&(i[e]=i[o=k&o+r])+(i[o]=r)];return u.i=e,u.j=o,t})(d)}function o(n,r){return r.i=n.i,r.j=n.j,r.S=n.S.slice(),r}function q(n,r){for(var t,e=n+"",o=0;o<e.length;)r[k&o]=k&(t^=19*r[k&o])+e.charCodeAt(o++);return s(r)}function s(n){return String.fromCharCode.apply(0,n)}if(b["seed"+g]=m,q(b.random(),a),"object"==typeof module&&module.exports){module.exports=m;try{l=require("crypto")}catch(n){}}else"function"==typeof define&&define.amd&&define(function(){return m})}([],Math);
Math.seedrandom('hello.');

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d');
canvas.width = document.body.offsetWidth;
canvas.height = document.body.offsetHeight;
c.translate(canvas.width/2, canvas.height/2);
// c.scale(1, 0.3);
// c.rotate(20 * Math.PI /180);

// let currentRotation = 45;
// let currentScale = 0.5;
// c.scale(1, 0.5)
// c.rotate(45 * Math.PI / 180);

// function changeRotation(r) {
//     c.rotate(-currentRotation * Math.PI / 180);

//     currentRotation = r;
//     c.rotate(currentRotation * Math.PI / 180);
// }

// function changeScale(s) {
//     c.scale(1, 1 / currentScale);
//     currentScale = s;
//     c.scale(1, currentScale);
// }
let fixSize = 2;
let s = 80;
function changeScale(newS) {
    s = newS;
}
const ALPHA = 0.2;

function getPosition(x, y) {
    return [
        (x - y)*s,
        (x + y)*s/2
    ]
}

function drawTop(x, y, color, w=1, h=1) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y))
    c.lineTo.apply(c, getPosition(x-w, y));
    c.lineTo.apply(c, getPosition(x-w,y-h));
    c.lineTo.apply(c, getPosition(x, y-h));
    c.lineWidth = fixSize;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.fill();
    c.stroke();
}

function drawRight(x, y, color, w, h) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y));
    let p = getPosition(x, y-w);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = getPosition(x, y);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    c.fillStyle = color;
    c.fill();
    c.lineWidth = fixSize;
    c.strokeStyle = color;
    c.stroke();
}

function drawLeft(x, y, color, w, h) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y));
    let p = getPosition(x-w, y);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = getPosition(x,y);
    p[1] += h*s;
    c.lineTo.apply(c,p);

    c.fillStyle = color;
    c.fill();
    c.lineWidth = fixSize;
    c.strokeStyle = color;
    c.stroke();
}

function col(c) {
    return 'rgb(' + c.join(',') + ')';
}

function shade(color, sh, alpha) {
    return [
        color[0] + (sh[0] - color[0]) * alpha,
        color[1] + (sh[1] - color[1]) * alpha,
        color[2] + (sh[2] - color[2]) * alpha
    ]
}

function darken(color, alpha) {
    return shade(color, [0,0,0], alpha);
}

function lighten(color, alpha) {
    return shade(color, [255,255,255], alpha);
}


function drawBox(x, y, color, w, d, h) {
    drawTop(x, y, col(color), w, d);
    drawLeft(x, y, col(lighten(color, ALPHA)), w, h);
    drawRight(x, y, col(darken(color, ALPHA)), d, h);
}


function drawRectangle(x, y, color, w = 1, h = 1) {
    // c.beginPath();
    // c.moveTo((x)*s, (y+1)*s);
    // c.lineTo((x+1) * s, (y+2) * s);
    // c.lineTo((x+2) * s, (y+2) * s);
    // c.stroke();


    // c.beginPath();
    // c.rect(x*s,y*s,s,s);
    // c.fillStyle = color;
    // c.fill();
    const dx = (x - y) * s
    const dy = (x + y) * (s/2)
    w--;

    c.beginPath();
    c.moveTo(dx+(w)*s, dy-w*s/2);
    c.lineTo(dx+s+w*s, dy+s/2-w*s/2);
    c.lineTo(dx, dy+s);
    c.lineTo(dx-s, dy+s/2);
    c.fillStyle = color;
    c.fill();
}

function drawRightFace(x, y, w, d, h, color) {
    const dx = (x - y) * s
    const dy = (x + y) * (s/2)
    c.beginPath();
    c.moveTo(dx, dy+s);
    c.lineTo(dx+s+w*s, dy+s/2-w*s/2)
    c.lineTo(dx+s+w*s, (dy+s/2)+h*s-w*s/2)
    c.lineTo(dx, dy+s+h*s)
    c.fillStyle = color;
    c.fill();
}

function drawLeftFace(x, y, w, d, h, color) {
    const dx = (x - y) * s
    const dy = (x + y) * (s/2)
    c.beginPath();
    c.moveTo(dx, dy+s);
    c.lineTo(dx-s*(d), dy+s/2-((d-1)*s/2))
    c.lineTo(dx-s*d, dy+s/2-((d-1)*s/2)+h*s);
    c.lineTo(dx, dy+s+h*s)
    c.fillStyle = color;

    c.fill();
}

// c.moveTo(0, 0);
// c.lineTo(100, 100)
// c.stroke();

const cM = 5;

function clear() {
    c.clearRect(-canvas.width*cM, -canvas.height*cM, canvas.width*cM*2, canvas.height*cM*2);
}

function drawRobot(x, y) {
    drawBox(x-0.6, y-0.9, [100,100,100], 0.1, 0.1, 0.5);

    drawBox(x-1.3, y-0.9, [100,100,100], 0.1, 0.1, 0.5);

    drawBox(x-0.2, y-0.2, [100, 100, 100], 0.1, 0.3, 0.1);
    drawBox(x - 0.9, y-0.2, [100,100, 100], 0.1, 0.3, 0.1);
}

function drawMap() {
    // drawBox(0, 0, [128, 128, 128], 2, 3, 0.2);
    for(let i=-10;i<0;i++) {
        drawBox(i,i,[200,128,128], 1, 1, 0.2);
        // drawRectangle(i+1, i, '#DDD');
        // drawRectangle(i+2, i, '#CCC');
    }
    // drawRightFace(0, 0, 2, 2, 2, 'red');
    // drawLeftFace(0, 0, 2, 4, 2, 'yellow')
}
let player = [0, 0];

function drawPlayer() {
    drawRectangle(player[0], player[1], 'green', 2, 2);
}


function draw() {
    console.log('draw')
    clear();
    // drawMap();
    drawPlayer();
    drawRobot(0, 0);

    requestAnimationFrame(draw);
}

draw();

document.addEventListener('keydown', function(e) {
    console.log(e.key);
    switch(e.key) {
        case 'ArrowDown':
            player[1]++;
            break;
        case 'ArrowUp':
            player[1]--;
            break;
        case 'ArrowLeft':
            player[0]--;
            break;
        case 'ArrowRight':
            player[0]++;
            break;
        case '+':
            changeScale(s+10);
            break;
        case '-':
        changeScale(s-10);
    }
})

// document.addEventListener('mousemove', function(e) {
//     let x = e.clientX;
//     const width = document.body.offsetWidth;
//     const deg = 180 * x / width;

//     let y = e.clientY;
//     const height = document.body.offsetHeight;
//     const scale = y / height;
//     console.log('SCALE', scale);

//     changeRotation(deg)
//     changeScale(scale);
// })