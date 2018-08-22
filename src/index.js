import Noise from './noise'

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d');
const CW = canvas.width = document.body.offsetWidth;
const CH = canvas.height = document.body.offsetHeight;
const camPos = [canvas.width/2, canvas.height/2]
c.translate.apply(c, camPos);
let fixSize = 2;
let D = 100032.4524;
let E = 3.3262;


const FRAME_LENGTH = 150;
let startTime = +(new Date());
let nextFrame = startTime + FRAME_LENGTH;

window.N = new Noise();

function randomGen(x,y) {
    return Math.sin(x) + Math.cos(y) / 2;
}


function getNoise(x,y) {
    return N.noise(E*x+D,E*y+D,E*D);
}

function isTile(x, y) {
    return getNoise(x,y) < 0.2;
}

// BOT CLASS
class Bot {
    constructor(x, y) {
        this.health = 5;
        this.x = x;
        this.y = y;
        this.a = [0,0];
        this.d = [0, 1];
    }

    render(r) {
        let a = this.pos(r);
        // return convertToDraw(ROBOT_SCHEME, a.x, a.y);
        let scheme = ROBOT_SCHEME_NEW.slice();

        if (this.isMoving()) {
            scheme[0] = scheme[0].slice();
            scheme[1] = scheme[1].slice();
            scheme[2] = scheme[2].slice();
            scheme[3] = scheme[3].slice();
            const j = r*2;
            if (j <= 0.5) {
                scheme[0][2] += j*0.2;
                scheme[1][2] += j*0.2;
            } else if(j <= 1) {
                scheme[0][2] += 0.2 - (j-0.5)*0.2;
                scheme[1][2] += 0.2 - (j-0.5)*0.2;
            } else if (j <= 1.5){
                scheme[2][2] += (j-1)*0.2;
                scheme[3][2] += (j-1)*0.2;
            } else {
                scheme[2][2] += 0.2 - (j-1.5)*0.2;
                scheme[3][2] += 0.2 - (j-1.5)*0.2;

            }
        }

        return convertDrawNew(scheme, a.x, a.y, this.d);
    }

    isMoving() {
        return this.a[0] + this.a[1] !== 0;
    }

    pos(r) {
        let dx = (r)*this.a[0];
        let dy = (r)*this.a[1];
        return {x: this.x  - dx, y: this.y - dy}
    }

    update() {
        this.a = [0,0];
        if (Math.random() > 0.2) {
            // decided to move ass
            let a = [0, 0];
            let r = Math.random();
            if (r > 0.75) {
                a[0]++;
            } else if(r > 0.5) {
                a[0]--;
            } else if (r > 0.25) {
                a[1]++;
            } else {
                a[1]--;
            }
            if (isTile(this.x+a[0], this.y+a[1])) {
                this.x += a[0];
                this.y += a[1];
                this.a = a;
                this.d = a;
            }
        }

        if (Math.random() > 0.7) {
            this.fire();
        }
    }

    fire() {
        bullets.push(new Bullet(this.x, this.y, this.d));
    }
}

class Player extends Bot {
    constructor(x, y) {
        super(x, y);
        this._nextA = [0, 0];
        this.isShieldActive = false;
    }
    render(r) {
        // console.log('DIRECTION', this.d);
        Bot.prototype.render.call(this, r);
        // convertToDraw(ROBOT_SCHEME, a.x, a.y);
        if (this.isShieldActive) {
            console.log('SHIELD');
            convertDrawNew(SHIELD, this.pos(r).x, this.pos(r).y, this.d)
        }
    }
    update() {
        this.x += this._nextA[0];
        this.y += this._nextA[1];
        this.a = this._nextA;

        if (this._nextA[0] + this._nextA[1] !== 0) {
            this.d = this._nextA;
        }
        this._nextA = [0, 0];
    }
    move(x,y) {
        if (isTile(this.x+x, this.y+y)) {
            this._nextA = [x, y];
            return true;
        }

        return false;
    }
}
window.c = c;
window.gP = getPosition;

class Camera {
    constructor(player) {
        this.p = player;
        this._c = [0, 0];
    }
    render(r) {
        c.translate(-this._c[0], -this._c[1]);
        let q = getPosition(this.p.pos(r).x, this.p.pos(r).y); // fixme: probably optimize
        // console.log('Q');
        this._c = [-q[0], -q[1]]
        c.translate.apply(c, this._c);
    }
}

let player = new Player(0, 0);
let camera = new Camera(player);

const BULLET_LIFETIME = 5;
const BULLET_SPEED = 2;
class Bullet {
    constructor(x, y, a) {
        this.x = x + a[0];
        this.y = y + a[1];
        this.a = a;
        this.ttl = BULLET_LIFETIME + 1;
        this.deactivated = false;
    }

    render(r) {
        if (this.deactivated) { return; }
        let dx = r*this.a[0]*BULLET_SPEED;
        let dy = r*this.a[1]*BULLET_SPEED;
        drawBullet(this.x-dx, this.y-dy);
    }

    update() {
        this.ttl--;
        this.x += this.a[0]*BULLET_SPEED;
        this.y += this.a[1]*BULLET_SPEED;
        if (!this.ttl) {
            this.deactivated = true;
        }
    }
}

const BAR_TIME = 0.25;

class Music {
    constructor(loop) {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioCtx.createOscillator();
        oscillator.type = 'square';

        this.o = oscillator;
        this.a = audioCtx;

        this.l = loop;
        this.lastT = null;

        oscillator.connect(audioCtx.destination);
        oscillator.start();
    }

    start() {

        if (!this.lastT) {
            this.lastT = this.a.currentTime;
        }

        let t = this.lastT;

        this.l.map((l) => {
            let d = l[0]*BAR_TIME / 4;
            this.o.frequency.setValueAtTime(l[1]*window.Z, t); // value in hertz
            t+=d;
        });
        this.lastT = t;

        const n = this.lastT - this.a.currentTime;
        console.log('DIFF', n);
        setTimeout(() =>{
            this.start();
        }, 1000 * n*0.95);
        // if (this.lastT - n > 0.1) {
        //     this.start();
        // } else {
        //     setTimeout(() => {
        //         this.start();
        //     }, 100);
        // }
    }
}

window.Z = 1;

const bass = (hz) => {
    const x=[];
    for(var i=0;i<8;i++) {
        x.push([2, hz])
        x.push([2, -1]);
    }
    return x;
}

const mus = new Music([].concat(bass(440/4), bass(400/4), bass(470/4), bass(440/4)));
mus.start();

// const mus = new Music([
//     [2, 440],
//     [2, -1],
//     [2, 440],
//     [2, -1],
//     [2, 490],
//     [2, -1],
//     [2, 490],
//     [2, -1],
//     [2, 440],
//     [2, -1],
//     [2, 440],
//     [2, -1],
//     [2, 450],
//     [2, -1],
//     [2, 450],
//     [2, -1],
// ]);
// mus.start();

// const mus2 = new Music([
//     [2, -1],
//     [2, 2*440],
//     [2, -1],
//     [2, 2*490],
//     [2, -1],
//     [2, 2*490],
//     [2, -1],
//     [2, 2*440],
//     [2, -1],
//     [2, 2*440],
//     [2, -1],
//     [2, 2*450],
//     [2, -1],
//     [2, 2*450],
//     [2, -1],
//     [2, 2*440],
// ])
// mus2.start();

function isOccupied(x, y) {
    return false;

}

// bulelts
let bullets = [];

// Make bots
const bots = []
while(bots.length<20) {
    var x = Math.floor(-50 * Math.random() + 20);
    var y = Math.floor(-50 * Math.random() + 20);
    if (isTile(x, y)) {
        bots.push(new Bot(x, y));
    }
}


let s = 80;
function changeScale(newS) {
    s = newS;
}
const ALPHA = 0.2;

window.S = 2;

function getPosition(x, y, dx=0, dy=0) {
    return [
        (x - y)*s + dx,
        (x + y)*s/window.S + dy
    ]
}

function drawTop(x, y, color, w=1, h=1, dx = 0, dy = 0, borderColor = color) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy))
    c.lineTo.apply(c, getPosition(x-w, y, dx, dy));
    c.lineTo.apply(c, getPosition(x-w,y-h, dx, dy));
    c.lineTo.apply(c, getPosition(x, y-h, dx, dy));
    c.closePath();
    c.lineWidth = fixSize;
    c.strokeStyle = borderColor;
    c.fillStyle = color;
    c.fill();
    c.stroke();
}

function drawRight(x, y, color, w, h, dx = 0, dy = 0, borderColor = color) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy));
    let p = getPosition(x, y-w, dx, dy);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = getPosition(x, y, dx, dy);
    p[1] += h*s;
    c.lineTo.apply(c, p, dx, dy);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.lineWidth = fixSize;
    c.strokeStyle = borderColor;
    c.stroke();
}

function drawLeft(x, y, color, w, h, dx = 0, dy = 0, borderColor = color) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy));
    let p = getPosition(x-w, y, dx, dy);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = getPosition(x,y, dx, dy);
    p[1] += h*s;
    c.lineTo.apply(c,p);
    c.closePath();

    c.fillStyle = color;
    c.fill();
    c.lineWidth = fixSize;
    c.strokeStyle = borderColor;
    c.stroke();
}

function col(c) {
    if (c.length === 3) {
        return 'rgb(' + c.join(',') + ')';
    } else {
        return 'rgba(' + c.join(',') + ')';
    }
}

function shade(color, sh, alpha) {
    var al = color.length > 3 ? color[3] : 1;
    return [
        color[0] + (sh[0] - color[0]) * alpha,
        color[1] + (sh[1] - color[1]) * alpha,
        color[2] + (sh[2] - color[2]) * alpha,
        al
    ]
}

function darken(color, alpha) {
    return shade(color, [0,0,0], alpha);
}

function lighten(color, alpha) {
    return shade(color, [255,255,255], alpha);
}


function drawBox(x, y, color = [128,128,128], w = 1, d = 1, h = 1, raise = 0, calculateFromTop = false, borderColor) {
    let dy = 0;
    if (calculateFromTop) {
        dy = -h*s;
    }
    dy -= raise * s;
    drawTop(x, y, col(color), w, d, 0, dy, borderColor);
    drawLeft(x, y, col(lighten(color, ALPHA)), w, h, 0, dy, borderColor);
    drawRight(x, y, col(darken(color, ALPHA)), d, h, 0, dy, borderColor);
}

const cM = 5;

function clear() {
    c.clearRect(-canvas.width*cM, -canvas.height*cM, canvas.width*cM*2, canvas.height*cM*2);
}

function convertToDraw(rec, x, y, dir = [0, 1]) {
    rec.map(r => {
        r = r.slice();
        r[0] = x - r[0];
        r[1] = y - r[1];
        drawBox.apply(null, r);
    })
}


function convertDrawNew(rec, x, y, dir) { // [x, y, z, w, d, h, col]
    // console.log('DIRECTION', dir);

    // if (dir[0]) {
    //     let ax = x;
    //     x = y;
    //     y = ax;
    // }

    if (dir[1] < 0) {
        rec = rec.map(x => {
            x = x.slice();
            x[1] = 1-x[1]
            return x;
        });
    }

    if(dir[0] < 0) {
        rec = rec.map(x => {
            x = x.slice();
            let t = 1 -x[0];
            x[0] = 1 - x[1];
            x[1] = t;
            t = x[3];
            x[3] = x[4];
            x[4] = t;
            return x;
        })
    }
    // FIXME: check if it could be simplified
    if(dir[0] > 0) {
        rec = rec.map(x => {
            x = x.slice();
            let t = 1 -x[0];
            x[0] = x[1];
            x[1] = t;
            t = x[3];
            x[3] = x[4];
            x[4] = t;
            return x;
        })
    }

    // const f = (x) => {
    //     const p = getPosition(x[0] + x[3]/2, x[1]+x[4]/2);
    //     return p[0] - p[1] - x[2] - x[5]/2;
    // }

    // const f = x => x[0];

    // rec = rec.sort((x,y) => f(x) - f(y));


    rec.map(r => {
        // here comes the magic
        let xx = r[0];
        let yx = r[1];
        let z = r[2];
        let w = r[3];
        let d = r[4];
        let h = r[5];
        let col = r[6];


        // if (dir[1] < 0) {
        //     yx = 1-yx;
        // }
        // if (dir[0] < 0) {
        //     let ax = 1 - xx;
        //     xx = 1 - yx;
        //     yx = ax;

        //     ax = w;
        //     w = d;
        //     d = ax;
        // }

        // if (dir[0] > 0) {
        //     let ax = 1 - xx;
        //     xx = yx;
        //     yx = ax;

        //     ax = w;
        //     w = d;
        //     d = ax;
        // }

        // console.log(dir);

        // console.log('DRAW', x - xx + w/2, y - yx + d/2, col, w, d, h, z - h/2, false);
        drawBox(x - xx + w/2, y - yx + d/2, col, w, d, h, z + h/2, false);
    })
}

function convNew(scheme) {
    return scheme.map(r => {
        let xx = r[0];
        let yx = r[1];
        let z = r[2];
        let w = r[3];
        let d = r[4];
        let h = r[5];
        let col = r[6];
        return [xx - w/2, yx - d/2, z - h/2, w, d, h, col];
    })
}

const PLAYER_SCHEME_NEW = [
    [0.5, 0.5, 0.05, 1, 1, 0.1, [200, 0, 0] ],
    [0.1, 0.5, 0.1, 0.1, 0.1, 0.1, [50, 50, 200, 0.6]]

]

const RC = [170, 170, 170];

const ROBOT_SCHEME = [
    // leg ??
    [0.3, 0.4, RC, 0.1, 0.3, 0.1],
    [0.3, 0.6, RC, 0.1, 0.1, 0.5, 0, true],
    
    // arm 2
    [0.8, 0.3, darken(RC, 0.2), 0.1, 0.3, 0.1, 0.6, true],
    [0.8, 0.2, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true],
    [0.8, 0.5, darken(RC, 0.2), 0.1, 0.1, 0.2, 0.7, true],

    // body
    [0.7, 0.4, RC, 0.1, 0.3, 0.1],
    [0.7, 0.6, RC, 0.1, 0.1, 0.5, 0, true],
    [0.3, 0.4, RC, 0.6, 0.6, 0.6, 0.5, true],

    [0.4, 0.5, RC, 0.4, 0.4, 0.4, 1.1, true], // head
    [0.45, 0.49, [0,0,0], 0.3, 0.01, 0.2, 1.2, true], // face

    // eyes:
    [0.75, 0.59, [0,0,200], 0.05, 0.01, 0.05, 1.2, true], // eye1
    [0.6, 0.59, [0,0,200], 0.05, 0.01, 0.05, 1.2, true], // eye 2

    // arm 1
    [0.2, 0.4, darken(RC, 0.2), 0.1, 0.3, 0.1, 0.6, true],
    [0.2, 0.3, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true],
    [0.2, 0.6, darken(RC, 0.2), 0.1, 0.1, 0.2, 0.7, true]
];

const ROBOT_SCHEME_NEW = [
    // [0.5,0.5,0.5, 1, 1, 1, RC],
    // [0.5, 0.5, 1.25, 0.5, 0.5, 0.5, [255, 0, 0]]
    [0.3, 0.4, 0.05, 0.1, 0.3, 0.1, RC],
    [0.3, 0.5, 0.3, 0.1, 0.1, 0.4, RC],

    [0.6, 0.4, 0.05, 0.1, 0.3, 0.1, RC],
    [0.6, 0.5, 0.3, 0.1, 0.1, 0.4, RC],

    // belly
    [0.5, 0.5, 0.6, 0.4, 0.4, 0.6, RC],
    // head
    [0.5, 0.5, 1.0, 0.2, 0.2, 0.2, RC],
    [0.5, 0.4, 1.0, 0.2, 0.001, 0.1, [255, 0, 0]]
]

// const ROBOT_SCHEME_NEW = convNew(ROBOT_SCHEME);

const SHIELD = [
    [0.5, 0.1, 0.5, 1, 0.01, 1, [50, 50, 200, 0.5]]
    // [0.3, 0.2, [50, 50, 200, 0.5], 0.8, 0.01, 0.8, 1.1],
]

// function drawRobot(x, y) {

//     // FIXME: make drawLeg
//     const RC = [170, 170, 170]
//     drawBox(x - 0.3, y - 0.4, RC, 0.1, 0.3, 0.1);
//     drawBox(x - 0.3, y - 0.6, RC, 0.1, 0.1, 0.5, 0, true);


//     // arm 2
//     drawBox(x - 0.8, y - 0.3, darken(RC, 0.2), 0.1, 0.3, 0.1, 0.6, true);
//     drawBox(x - 0.8, y - 0.2, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true);
//     drawBox(x - 0.8, y - 0.5, darken(RC, 0.2), 0.1, 0.1, 0.2, 0.7, true);

//     // body
//     drawBox(x - 0.7, y - 0.4, RC, 0.1, 0.3, 0.1);
//     drawBox(x - 0.7, y - 0.6, RC, 0.1, 0.1, 0.5, 0, true);
//     drawBox(x - 0.3, y - 0.4, RC, 0.6, 0.6, 0.6, 0.5, true);

//     drawBox(x - 0.4, y - 0.5, RC, 0.4, 0.4, 0.4, 1.1, true); // head
//     drawBox(x - 0.45, y - 0.49, [0,0,0], 0.3, 0.01, 0.2, 1.2, true); // face

//     // eyes
//     drawBox(x - 0.75, y - 0.59, [0,0,200], 0.05, 0.01, 0.05, 1.2, true); // eye1
//     drawBox(x - 0.6, y - 0.59, [0,0,200], 0.05, 0.01, 0.05, 1.2, true); // eye2

    
//     // arm 1
//     drawBox(x - 0.2, y - 0.4, darken(RC, 0.2), 0.1, 0.3, 0.1, 0.6, true);
//     drawBox(x - 0.2, y - 0.3, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true);
//     drawBox(x - 0.2, y - 0.6, darken(RC, 0.2), 0.1, 0.1, 0.2, 0.7, true);
// }

function drawBullet(x, y, opacity = 1) {
    drawBox(x - 0.2, y - 0.2, [200, 50, 50, opacity], 0.1, 0.1, 0.1, 0.6, true);
}



const grd = c.createLinearGradient(camPos[0] - CW/2, camPos[1] - CH/2, camPos[0] - CW/2, camPos[1] + CH);
grd.addColorStop(0, '#8f27a8');
grd.addColorStop(1, '#33B');

const grd2 = c.createLinearGradient(camPos[0] - CW/2, camPos[1] - CH/2, camPos[0] - CW/2, camPos[1] + CH);
grd2.addColorStop(0, 'rgba(28, 206,52, 0.5)');
grd2.addColorStop(1, 'rgba(226, 217,3, 0.5)');

function drawMap() {
    for(let i=player.x-20;i<player.x+20;i++) {
        for(let j=player.y-20;j<player.y+20;j++) {
            if (isTile(i,j)) {
                drawBox(i,j,[50, 50, 50, 1], 1, 1, 0.2, 0, false, grd2);
            }
        }
    }
}

function drawPlayer(r) {
    player.render(r); // FIXME: move shield rendering to class
}

function drawBackground(r) {
    c.fillStyle=grd;
    const sm = getPosition(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
    c.fillRect(sm[0], sm[1], CW, CH);
}

function drawEnemies(r) {
    bots.map(b => b.render(r));
}

function drawBullets(r) {
    bullets.map(b => b.render(r));
}

function recomputeFrame() {
    let now = +(new Date());
    if (now > nextFrame) {
        // updating all
        bots.map(b => b.update());
        bullets.map(b => b.update());
        player.update();
        nextFrame = now + FRAME_LENGTH;
        // FIXME: collision detection probably.
    }

    return (nextFrame - now) / FRAME_LENGTH;
}


function draw() {
    const currentFrameMoment = recomputeFrame();
    clear();
    camera.render(currentFrameMoment);
    drawBackground(currentFrameMoment);
    drawMap();
    drawEnemies(currentFrameMoment);
    drawBullets(currentFrameMoment);
    drawPlayer(currentFrameMoment);
    // drawRobot(0, 0);

    requestAnimationFrame(draw);
}

draw();

document.addEventListener('keyup', function(e) {
    if (e.key === 'z') {
        player.isShieldActive = false;
    }
});

document.addEventListener('keydown', function(e) {
    let a = [0, 0];
    switch(e.key) {
        case 'ArrowDown':
            player.move(0,1)
            break;
        case 'ArrowUp':
            player.move(0, -1)
            break;
        case 'ArrowLeft':
            player.move(-1, 0)
            break;
        case 'ArrowRight':
            player.move(1, 0)
            break;
        case 'X':
        case 'x':
            player.fire();
            break;
        case 'z':
            player.isShieldActive = true;
            break;
        case '+':
            changeScale(s+10);
            break;
        case '-':
        changeScale(s-10);
    }
})

window.addEventListener('mousemove', function(e) {
    const ratio = ((e.clientY / window.document.body.offsetHeight) - 0.5) * 2;
    console.log(ratio);
    window.S = 2 + ratio * 5;
})