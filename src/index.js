import N from './noise'

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d');
const CW = canvas.width = document.body.offsetWidth;
const CH = canvas.height = document.body.offsetHeight;
const camPos = [canvas.width/2, canvas.height/2]
c.translate.apply(c, camPos);
let fixSize = 2;
let D = 100032.4524;
let E = 3.3262;
const RC = [170, 170, 170];
const dirs = [[-1,0],[1,0], [0,1], [0,-1]];
const darr = ['left','right','down','up'];
let rnd = () => Math.random();

let START_SPAWN = false;

const CT = {};

let frame = 0;
const FRAME_LENGTH = 100;
let startTime = +(new Date());
let nextFrame = startTime + FRAME_LENGTH;

function getNoise(x,y) {
    return N(E*x+D,E*y+D,E*D);
}

function isTile(x, y) {

    if (Math.abs(x) % 60 > 57 || Math.abs(y) % 60 > 57) {
        return isBr(x, y);
    }

    return (x >= -52 && x <= -49 && y >=8 && y <= 11) || (getNoise(x,y) < 0.2 || getNoise(x, y) > 0.8) && !(2*x>3*y) && (2*x*y<x+y+10 ) && !(x-30)*(x-30)+(y-10)*(y-10)>1;
}

function isBr(x, y) {
    let ax = Math.abs(x) % 60;
    let ay = Math.abs(y) % 60;
    return (ax > 57 || ay > 57) && (ax % 19 > 17 || ay%19 > 17);
}

function isPODS(x, y) { // is part of data stream
    return y > 8 && y < 12;
}

let MD = {
    type: 'S',
};

function enTM(text, noscale) {
    let t = text.shift();
    let aFT = frame + 10;
    if (noscale) {
        aFT = frame - 1;
    }
    MD = {
        type: 'T',
        aFT: aFT,
        cTX: '',
        fullText: t,
        nextLetterTime: 0,
        nextText: text
    }
};

function Est() {
    MD = {
        type: 'ST',
        fullScaleOut: frame + 5,
        initialScale: s
    }
}

function enterStageMode() {
    MD = {
        type: 'S'
    }
}

function dsTr(r) {
    if (frame > MD.fullScaleOut) {
        changeScale(defaultScale);
        enterStageMode();
    } else {
        let fr = (MD.fullScaleOut - frame)/5 + r/(5*5);
        changeScale(defaultScale + fr * (MD.initialScale - defaultScale));
    }
}

function dTF(r) {
    if (MD.cTX.length === MD.fullText.length && isKey('x')) {
        if (MD.nextText.length) {
            enTM(MD.nextText, true);
        } else if (!player.health) {
            location.reload();
        } else {
            Est();
        }
        return;
    } else if (frame <= MD.aFT) {
        let fr = (10 - (MD.aFT - frame))/10 + r/100;
        changeScale(defaultScale + fr * 80);
        return;
    } else if (MD.nextLetterTime < (frame + r) && MD.cTX.length !== MD.fullText.length) {
        MD.cTX += MD.fullText[MD.cTX.length];
        MD.nextLetterTime = 0;
    }

    drawTextfield(MD.cTX);
}

class Obj {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.a = [0,0];
        this.d = [0, 1];
        this._s = null;
    }

    pR(scheme, t) {
        return scheme;
    }

    render(t) {
        let scheme = this._s(t).slice().map(s => s.slice());
        scheme = this.pR(scheme, t);

        if (this.isHit) {
            let q = t;
            if (q > 0.5) {
                q = 1-q;
            }
            scheme = scheme.map(s => {
                s[6] = shade(s[6], [255,0,0], q)
                return s;
            })
        }

        if (this.isDying) {
            let q = t;
            scheme = scheme.map(s => {
                s[6] = shade(s[6], [255,100,0], t)
                s[6][3] = t;
                const RT = 1.5;
                s[3] *= RT*(1+(1-t));
                s[4] *= RT*(1+(1-t));
                s[5] *= RT*(1+(1-t));
                return s;
            })
        }

        let a = this.pos(t);
        return conv(scheme, a.x, a.y, this.d);
    }

    pos(r) {
        let dx = (r)*this.a[0];
        let dy = (r)*this.a[1];
        return {x: this.x  - dx, y: this.y - dy}
    }

}

class Health extends Obj {
    constructor(x, y) {
        super(x,y);
        this._s = () => getHeart();
        this.ct = 'H';
    }
}

class Coin extends Obj {
    constructor(x,y) {
        super(x,y);
        this._s = getCoin;
        this.ct = 'C';
    }
}

function plD(b) {
    return Math.abs(b.x - player.x) + Math.abs(b.y - player.y);
}

class Enemy extends Obj {
    constructor(x, y) {
        super(x, y);
        this.health = 1;
        this.isDying = false;
        this.isHit = false;
        this._moveRatio = 0;
        this._fireRatio = 0;
    }

    isMoving() {
        return this.a[0] + this.a[1] != 0;
    }

    update() {
        this.a = [0,0];
        if (rnd() < this._moveRatio) {
            // decided to move ass
            let a = [0, 0];
            let r = rnd();
            if (r > 0.75) {
                a[0]++;
            } else if(r > 0.5) {
                a[0]--;
            } else if (r > 0.25) {
                a[1]++;
            } else {
                a[1]--;
            }
            if (isTile(this.x+a[0], this.y+a[1]) && !isOc(this.x+a[0], this.y+a[1])) {
                this.x += a[0];
                this.y += a[1];
                this.a = a;
                this.d = a;
            }
        }

        if (rnd() < this._fireRatio) {
            this.fire();
        }
    }

    onHealthChange(h) {
        
    }

    hit() {
        if (--this.health <= 0) {
            this.isDying = true;
            explosionSound();
        } else {
            this.isHit = true;
        }
        this.onHealthChange(this.health);
    }

    fire() {
        bullets.push(new Bullet(this.x, this.y, this.d));
        shotSound(plD(this));
    }    
}

let moveLeg = (s,j, r) => {
    j.map(i => s[i] = s[i].slice());
    if (r < 0.5) {
        s[j[0]][2] += r*0.2;
        s[j[1][2]] += r*0.2;
    } else if(r < 1) {
        s[j[0]][2] += 0.2 - (r-0.5)*0.2;
        s[j[1][2]] += 0.2 - (r-0.5)*0.2;
    } else if (r < 1.5) {
        s[2][2] += (r-1)*0.2;
        s[3][2] += (r-1)*0.2;
    } else {
        s[2][2] += 0.2 - (r-1.5)*0.2;
        s[3][2] += 0.2 - (r-1.5)*0.2;
    }
    return s;
}

// BOT CLASS
class Bot extends Enemy {
    constructor(x, y) {
        super(x,y);
        this.health = 3;
        this._s = () => getRobot(this.d);
        this._moveRatio = 0.5;
        this._fireRatio = 0.05;
    }

    pR(s, r) { // prerender

        if (this.isMoving()) {
            s = moveLeg(s, [0,1,2,3], r*2);
        }
        return s;
    }
}

class Agrobot extends Bot {
    pR(s, r) {
        let b = super.pR(s, r);
        return b.map(x => {
            x[6] = x[6].slice();
            x[6][0] = 255;
            return x;
        });
    }

    update() {
        this.a = [0,0];
        let px = player.x;
        let py = player.y;
        let x = this.x;
        let y = this.y;
        if (
            (x === px && (py -y) * ((py - 5)*this.d[1] - y) < 0) ||
            (y === py && (px - x) * ((px - 5)*this.d[0] - x) < 0)
        ) {
            if (this.lastFired + 5 < frame) {
                this.lastFired = frame;
                this.fire();
            }
        } else {
            super.update();
        }
    }
}

class Swarm extends Bot {
    constructor(x, y) {
        super(x,y);
        this._s = (r) => getSwarm(r);
    }

    fire() {
        dirs.map(d => bullets.push(new Bullet(this.x, this.y, d)));
        shotSound(plD(this));
    }
}

class Virus extends Enemy {
    constructor(x,y) {
        super(x,y);
        this._s = getVirus;
        this._moveRatio = 0.1;
    }
}


const ALF = [Virus];

let EN_COUNT = 10;
let SHIELD_ACTIVE = false;

const triggers = [
    {
        t: (x, y) => y === 11,
        v: () => {
            lead.volNext(3);
            enTM([
                'This is our main datastream.',
                'All the information on the internet runs through here.',
                'Behind this bridge you can find many unpleastant things',
                'Viruses, bots, swarms of data',
                'You can use your gun by pressing X',
                'Be prepared.',
            ]);
            START_SPAWN = true;
        }
    },
    {
        t: (x, y) => x === -20,
        v: () => {
            enTM([
                'This is a coin',
                'It is the key to restore online connection',
                'Do not ask me how it works, just trust me',
                'Gather coins to unlock the way to freedom',
                'But remember: The reacher you get, the stronger are the enemies!'
            ])
        }
    },
    {
        t: () => player.coins >= 5,
        v: function() {
            ALF.push(Bot);
            EN_COUNT = 15;
            enTM([
                'That\'s a good start!',
                'Now you can face more powerful foes.',
                'They are equiped with lasers, similiar to the one you have',
                'Try not to get hit.'
            ]);
        }
    },
    {
        t: () => player.coins > 60,
        v: () => {
            grd2 = mgd('#f00', '#600');
        }
    },
    {
        t: () => player.coins >= 20,
        v: () => {
            grd = mgd('#3F8', '#2EA');
        }
    },
    {
        t: () => player.coins >= 25,
        v: () => {
            EN_COUNT = 20;
            SHIELD_ACTIVE = true;
            enTM([
                'Now you will face much more agresive bots.',
                'They have been infected and they will try to shoot you on site.',
                'I have upgraded your avatar with the shield',
                'Press Z to activate it',
                'It works in the single direction though.',
                'Be quick or be dead!'
            ]);
            ALF.push(Agrobot);
        },
    },
    {
        t: () => player.coins >= 40,
        v: () => {
            EN_COUNT = 30;
            enTM([
                'You are getting rich quite fast',
                'Actually, you are almost half way there',
                'Gather 100 coins and you will set yourself free',
                'But before that, the wild swarm can appear',
                'It shoots in all directions. This is the deadliest enemy here.',
                'Watch out!'
            ]);
            ALF.push(Swarm);
            ALF.shift();
        }
    },
    {
        t: () => !player.health,
        v: function() {
            enTM(['G A M E  O V E R', 'You have collected ' + player.coins + ' coins!']);
        }
    },
    {
        t: () => player.coins >= 100,
        v: () => {
            grd = mgd('#3F8', '#2EA');
            enTM([
                'Congratulations!',
                'You have restored online connection',
                'You are saved!',
                'You can play in the endless mode now.',
                'Every 10 coins will activate disco mode for a while (epilepsy warning)',
                'Thank you for playing.',
                'Special thanks to my inspiration, N.',
                'Game by Kacper "kulak" Kula. 2018.'
            ]);
        }
    },
    {
        t: () => player.coins > 100 && player.coins % 10 == 0,
        d: true,
        v: () => {
            grd = mgd(
                col([rnd()*255, rnd()*255,rnd()*255]),
                col([rnd()*255, rnd()*255,rnd()*255])
            );
        }
    }
]


function computeTriggers(x, y) {
    triggers.map(t => {
        if (t.t(x,y) && !t.used) {
            t.v();
            t.used = true && !t.d;
        }
    });
}

class Player extends Enemy {
    constructor(x, y) {
        super(x, y);
        this._nextA = [0, 0];
        this.health = 5;
        this.isSA = false;
        this.coins = 0;
        this._s = (r) => getPlayer(this.d);
        // this._s = () => getPlayer(this.d);
    }
    pR(s, r) {

        if (this.isMoving()) {
            s = moveLeg(s, [1,3,2,4], r*2);
        }

        if (this.isSA) {
            return [...s, ...SHIELD];
        }
        return s;
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
        if (isTile(this.x+x, this.y+y) && !isOc(this.x+x, this.y+y)) {
            this._nextA = [x, y];
            return true;
        } else {
            this.d = [x,y];
        }

        return false;
    }

    onHealthChange(h) {
        let v = 0.1 * (5-h);
        lead2.vol(v);
        lead3.vol(v);
    }

    collect(c) {
        if (this.isDying) {
            return;
        }
        colSound();

        if (c.ct === 'H' && this.health < 5) {
            this.health++;
            this.onHealthChange(this.health);
        }
        if (c.ct === 'C') {
            this.coins++;
        }
    }
}

class Camera {
    constructor(player) {
        this.p = player;
        this._c = [0, 0];
    }
    render(r) {
        c.translate(-this._c[0], -this._c[1]);
        let q = gPos(this.p.pos(r).x, this.p.pos(r).y); // fixme: probably optimize
        this._c = [-q[0], -q[1]]
        c.translate.apply(c, this._c);
    }
}

let player = new Player(0, 0);
let camera = new Camera(player);

const BULLET_LIFETIME = 8;
const BULLET_SPEED = 3;
class Bullet {
    constructor(x, y, a) {
        this.x = x + a[0];
        this.y = y + a[1];
        this.a = a;
        this.ttl = BULLET_LIFETIME + 1;
        this.togc = false;
    }

    render(r) {
        if (this.deactivated) { return; }
        let dx = (1-r)*this.a[0]*BULLET_SPEED;
        let dy = (1-r)*this.a[1]*BULLET_SPEED;
        drawBullet(this.x+dx, this.y+dy);
    }

    update() {
        this.ttl--;
        this.x += this.a[0]*BULLET_SPEED;
        this.y += this.a[1]*BULLET_SPEED;
        if (!this.ttl) {
            this.togc = true;
        }
    }
}

const BAR_TIME = 0.40;

const A = new (window.AudioContext || window.webkitAudioContext)();
var g = A.createGain();
var o = A.createOscillator();
o.type = 'square';
o.connect(g);
g.connect(A.destination);
o.start();
g.gain.linearRampToValueAtTime(0, A.currentTime + 0.01);

function shotSound(distance) {
    if (distance > 10) {
        return;
    }
    let t = A.currentTime;
    g.gain.setValueAtTime(80, t);
    o.frequency.setValueAtTime(300, t)
    o.frequency.linearRampToValueAtTime(140, t + 0.1)
    g.gain.linearRampToValueAtTime(0, t + 0.1);
}

var gg = A.createGain();
var oo = A.createOscillator();
oo.type = 'square';
oo.connect(gg);
gg.connect(A.destination);
oo.start();
gg.gain.linearRampToValueAtTime(0, A.currentTime + 0.01);

function explosionSound() {
    let t = A.currentTime;
    gg.gain.setValueAtTime(100, t);
    for(var i=0;i<10;i++) {
        // oo.frequency.linearRampToValueAtTime(140, a.currentTime + i*0.03)
        oo.frequency.linearRampToValueAtTime(50, t + i*0.01 + 0.01)
    }
    // o.frequency.linearRampToValueAtTime(300, a.currentTime + 0.7)
    gg.gain.linearRampToValueAtTime(0, t + 0.15);
}

let colSound = (() => {
    let g = A.createGain();
    let o = A.createOscillator();
    o.type = 'square';
    o.connect(g);
    g.connect(A.destination);
    o.start();
    g.gain.linearRampToValueAtTime(0, A.currentTime + 0.01);
    return () => {
        let t = A.currentTime;
        g.gain.setValueAtTime(80, t);
        o.frequency.setValueAtTime(1000, t)
        o.frequency.linearRampToValueAtTime(1800, t + 0.1)
        g.gain.linearRampToValueAtTime(0, t + 0.1);
    }
})();

class Music {
    constructor(loop, semi, type, volume = 100) {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        oscillator.type = type;
        

        this.o = oscillator;
        this.a = audioCtx;
        this.semi = semi*1.0595;

        this.l = loop;
        this.lastT = null;

        oscillator.connect(g);
        g.connect(audioCtx.destination);
        g.gain.setValueAtTime(volume, audioCtx.currentTime);
        this.g = g;

        oscillator.start();
    }

    vol(x) {
        this.g.gain.linearRampToValueAtTime(x, this.a.currentTime + 0.5);
    }
    
    volNext(x) {
        this.g.gain.linearRampToValueAtTime(x, this.lastT + 0.1);
    }

    start() {

        if (!this.lastT) {
            this.lastT = this.a.currentTime;
        }

        let t = this.lastT;

        this.l.map((l) => {
            let d = l[0]*BAR_TIME / 4;
            if(l[1]) {
                // this.n.o(l[1]*5, 50, t);
                // this.n.f(t+d-0.001);
                this.o.frequency.setValueAtTime((l[1]+this.semi)*window.Z, t); // value in hertz
                this.o.frequency.setValueAtTime(0, t+d-0.01);
            }
            t+=d;
        });
        this.lastT = t;

        const n = this.lastT - this.a.currentTime;
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

function rep(x, times) {
    let y = [];
    for(let i=0;i<times;i++) {
        y.push(x);
    }
    return y;
}

let flat = a => a.reduce((c, v) => c.concat(v));

let makeMusic = m => m.map(n => [n[0], 27.6*Math.pow(2, (n[1]-21)/12)])

let DR = 4;
let DX = 2;

let NEW_BASS = makeMusic(flat([
    rep([DR, 24], 8),
    rep([DR, 32], 8),
    rep([DR, 34], 8),
    rep([DR, 30], 8)
]));

let NEW_LEAD = makeMusic([
    [DX, 60],
    [DX, 63],
    [DX, 68],
    [DX, 63],
    [DX, 60], // rep
    [DX, 63],
    [DX, 68],
    [DX, 63],

    [DX, 55],
    [DX, 60],
    [DX, 65],
    [DX, 63],
    [DX, 70],
    [DX, 63],
    [DX, 67],
    [DX, 63],

    [DX, 60], // rep
    [DX, 63],
    [DX, 68],
    [DX, 63],

    [DX, 70],
    [DX, 65],
    [DX, 65],
    [DX, 63]

])

const bs = new Music(NEW_BASS, 0, 'sawtooth', 1);
bs.start();

const lead = new Music(NEW_LEAD, 0, 'sine', 0);
lead.start();

const lead2 = new Music(NEW_LEAD, -5, 'square', 0);
lead2.start();

const lead3 = new Music(NEW_LEAD, +5, 'square', 0);
lead3.start();

function isOc(x, y) {
    return [...bots,player].reduce((a,b) => a || b.x == x && b.y == y, 0);

}

// bulelts
let bullets = [];

// Make bots
let bots = []

let pups = [new Coin(-22, 4)];



const defaultScale = 80;
let s = defaultScale;
function changeScale(newS) {
    s = newS;
}
const ALPHA = 0.2;

window.S = 2;

function gPos(x, y, dx=0, dy=0) {
    return [
        (x - y)*s + dx,
        (x + y)*s/window.S + dy
    ]
}

function drawTop(x, y, color, w=1, h=1, dx = 0, dy = 0, borderColor) {
    c.beginPath();
    c.moveTo.apply(c, gPos(x,y, dx, dy))
    c.lineTo.apply(c, gPos(x-w, y, dx, dy));
    c.lineTo.apply(c, gPos(x-w,y-h, dx, dy));
    c.lineTo.apply(c, gPos(x, y-h, dx, dy));
    c.closePath();
    c.lineWidth = fixSize;
    c.fillStyle = color;
    c.fill();
    if (borderColor) {
        c.strokeStyle = borderColor;
        c.stroke();
    }
}

function drawRight(x, y, color, w, h, dx = 0, dy = 0, borderColor = color) {
    c.beginPath();
    c.moveTo.apply(c, gPos(x,y, dx, dy));
    let p = gPos(x, y-w, dx, dy);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = gPos(x, y, dx, dy);
    p[1] += h*s;
    c.lineTo.apply(c, p, dx, dy);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (borderColor) {
        c.lineWidth = fixSize;
        c.strokeStyle = borderColor;
        c.stroke();
    }
}

function drawLeft(x, y, color, w, h, dx = 0, dy = 0, borderColor = color) {
    c.beginPath();
    c.moveTo.apply(c, gPos(x,y, dx, dy));
    let p = gPos(x-w, y, dx, dy);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = gPos(x,y, dx, dy);
    p[1] += h*s;
    c.lineTo.apply(c,p);
    c.closePath();

    c.fillStyle = color;
    c.fill();
    if (borderColor) {
        c.lineWidth = fixSize;
        c.strokeStyle = borderColor;
        c.stroke();
    }
}

function col(c) {
    if (c.length === 3) {
        return 'rgb(' + c.join(',') + ')';
    } else {
        return 'rgba(' + c.join(',') + ')';
    }
}

function shade(c, sh, alpha) {
    var al = c.length > 3 ? c[3] : 1;
    return [
        c[0] + (sh[0] - c[0]) * alpha,
        c[1] + (sh[1] - c[1]) * alpha,
        c[2] + (sh[2] - c[2]) * alpha,
        al
    ]
}

function darken(color, alpha) {
    return shade(color, [0,0,0], alpha);
}

function lighten(color, alpha) {
    return shade(color, [255,255,255], alpha);
}


function dBx(x, y, color = [128,128,128], w = 1, d = 1, h = 1, raise = 0, calculateFromTop = false, borderColor, ddx = 0, ddy = 0) {
    let dy = ddy;
    if (calculateFromTop) {
        dy = -h*s;
    }
    dy -= raise * s;
    drawTop(x, y, col(color), w, d, ddx, dy, borderColor);
    drawLeft(x, y, col(lighten(color, ALPHA)), w, h, ddx, dy, borderColor);
    drawRight(x, y, col(darken(color, ALPHA)), d, h, ddx, dy, borderColor);
}

const cM = 5;

function clear() {
    c.clearRect(-canvas.width*cM, -canvas.height*cM, canvas.width*cM*2, canvas.height*cM*2);
}

function conv(rec, x, y, dir, dx = 0, dy = 0) { // [x, y, z, w, d, h, col]
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
            let t = x[0];
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
            let t = x[0];
            x[0] = x[1];
            x[1] = t;
            t = x[3];
            x[3] = x[4];
            x[4] = t;
            return x;
        })
    }

    // const f = (x) => {
    //     const p = gPos(x[0] + x[3]/2, x[1]+x[4]/2);
    //     return p[2] + p[0] + p[1];
    // }

    // const orderFn = (a, b) => {
    //     let res = [-1,-1,1];
    //     for(var i=0;i<3;i++) {
    //         if (a[0+i] - a[3+i] >= b[0+i] + b[3+i]) {
    //             return res[i];
    //         } else if (b[0+i] - b[3+i] >= a[0+i] + a[3+i]) {
    //             return -res[i];
    //         }
    //     }
    //     return -1;
    // }

    // const f = x => x[0];

    // rec = rec.sort((a,b) => -f(a) + f(b));


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
        dBx(x - xx + w/2, y - yx + d/2, col, w, d, h, z + h/2, false, false, dx, dy);
    })
}

const PC = [200, 180, 150]

function getPlayer(dir) {
    const p = [
        [0.65, 0.4, 0.4, 0.05, 0.2,0.05, [90,70,200]],
        [0.35, 0.425, 0.05, 0.05, 0.2, 0.05, PC],
        [0.35, 0.5, 0.15, 0.05, 0.05, 0.2, PC],

        [0.55, 0.425, 0.05, 0.05, 0.2, 0.05, PC],
        [0.55, 0.5, 0.15, 0.05, 0.05, 0.2, PC],

        // belly
        [0.5, 0.5, 0.4, 0.2, 0.2, 0.4, [90, 70, 150]],
        // head
        [0.5, 0.5, 0.7, 0.3, 0.3, 0.3, PC],
        [0.5, 0.5, 0.85, 0.3, 0.3, 0.01, [140, 70, 45]],

        // hand
        [0.35, 0.4, 0.4, 0.05, 0.2,0.05, [90,70,200]],
        // eye

        // [0.5, 0.4, 1.0, 0.2, 0.001, 0.1, [255, 0, 0]]
    ]
    let dirs = [[dir[0], dir[1]], [dir[1], dir[0]]];
    if (dir[0] > 0) {
        dirs=[[1,0],[0,1]];
    }
    if (dir[1] < 0) {
        dirs = [[-1, 0], [0,1]];
    }
    if (dir[0] < 0) {
        dirs = [[-1, 0], [0, 1]];
    }
    if (dir[0]+dir[1] > 0) {
       p.push([0.45, 0.35, 0.7, 0.05, 0.001, 0.05, [0, 0, 0]]);
       p.push([0.6, 0.35, 0.7, 0.05, 0.001, 0.05, [0, 0, 0]]);
        p.push([0.525, 0.35, 0.6, 0.03, 0.001, 0.03, [200, 60, 50]]);
    }
    for(let d of dirs) {
        for(var i=0;i<10;i++) {
            let siz = 0.03;
            let len = (Math.sin(i+1.4)+1)*0.05+0.05;
            p.push([
                0.5 + !!d[0]*(-0.15 + 0.0015+ i*0.03) - 0.15 * d[1],
                0.5 + !!d[1]*(-0.15 + 0.0015 + i*0.03) - 0.15 * d[0],
                0.87 - len/2,
                0.01,
                0.03,
                len,
                [140,70,45]
            ])
        }
    }
    return p;
}

function getHeart(isOff) {
    let x = [];
    let color = [200, 0, 0];
    if (isOff) {
        color = [100, 100, 100, 0.8];
    }
    for(let i=0;i<5;i++) {
        x.push([
                0.5,
                0.5,
                0.05*i,
                0.05+i*0.1,
                0.1,
                0.05,
                color
        ])
    }
    for(let i=5;i<8;i++) {
        x.push([
            0.35,
            0.5,
            0.05*i,
            0.25 - (i-5)*0.05,
            0.1,
            0.05,
            color
        ])
        x.push([
            0.65,
            0.5,
            0.05*i,
            0.25 - (i-5)*0.05,
            0.1,
            0.05,
            color
        ])
    }
    return x;
}

function getSwarm(r) {
    const s = [];
    for(let j=0;j<5;j++) {
        for(let i=0;i<10;i++) {
            s.push([
                0.5 + Math.sin(2*Math.PI/10*i)*0.3,
                0.5 + Math.cos(2*Math.PI/10*i)*0.3,
                0.5 + Math.cos(2*Math.PI/10*j)*0.3,
                0.05,
                0.05,
                0.05,
                [200-24*i, 40*j, j*i*0.5, 0.5]
            ])
        }
    }
    return s.map(x => {
        x = x.slice();
        x[3] -= Math.sin(2*Math.PI*r)*0.3;
        x[2] += rnd()*0.4;
        x[6] = x[6].slice();
        x[6][0] += rnd()*10;
        x[6][1] += rnd()*20;
        x[6][2] -= rnd()*10;
        return x;
    })
}

function getVirus(r) {
    r = getMultiframePosition(15, frame, r);
    let v = [];
    for(let i=0;i<8;i++) {
        v.push([
            0.5 + Math.sin(2*Math.PI/8*i)*0.4*Math.cos(2*Math.PI*r),
            0.5 + Math.cos(2*Math.PI/8*i)*0.4*Math.sin(2*Math.PI*r),
            0.5,
            0.1,
            0.1,
            0.1,
            [40, 80+i*20, 200-i*10]
        ])
    }
    return v;
}

function getCoin(r) {
    let v = [];
    for(let i=1;i<8;i++) {
        v.push([
            0.5,
            0.5,
            0.05*i,
            0.05+0.2*Math.sin(Math.PI*(i/8)),
            0.1,
            0.05,
            [200,200,0]
        ])
    }
    return v;
}

function getMultiframePosition(multi, frame, r) {
    return (frame % multi)/multi + r / (multi*multi);
}


// const ROBOT_s = [
//     // leg ??
//     [0.3, 0.4, RC, 0.1, 0.3, 0.1],
//     [0.3, 0.6, RC, 0.1, 0.1, 0.5, 0, true],
    
//     // arm 2
//     [0.8, 0.3, darken(RC, 0.2), 0.1, 0.3, 0.1, 0.6, true],
//     [0.8, 0.2, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true],
//     [0.8, 0.5, darken(RC, 0.2), 0.1, 0.1, 0.2, 0.7, true],

//     // body
//     [0.7, 0.4, RC, 0.1, 0.3, 0.1],
//     [0.7, 0.6, RC, 0.1, 0.1, 0.5, 0, true],
//     [0.3, 0.4, RC, 0.6, 0.6, 0.6, 0.5, true],

//     [0.4, 0.5, RC, 0.4, 0.4, 0.4, 1.1, true], // head
//     [0.45, 0.49, [0,0,0], 0.3, 0.01, 0.2, 1.2, true], // face

//     // eyes:
//     [0.75, 0.59, [0,0,200], 0.05, 0.01, 0.05, 1.2, true], // eye1
//     [0.6, 0.59, [0,0,200], 0.05, 0.01, 0.05, 1.2, true], // eye 2

//     // arm 1
//     [0.2, 0.4, darken(RC, 0.2), 0.1, 0.3, 0.1, 0.6, true],
//     [0.2, 0.3, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true],
//     [0.2, 0.6, darken(RC, 0.2), 0.1, 0.1, 0.2, 0.7, true]
// ];
function getRobot(d) { // FIXME: add arm
        let x= [
        // [0.5,0.5,0.5, 1, 1, 1, RC],
        // [0.5, 0.5, 1.25, 0.5, 0.5, 0.5, [255, 0, 0]]
        [0.3, 0.4, 0.05, 0.1, 0.3, 0.1, RC],
        [0.3, 0.5, 0.3, 0.1, 0.1, 0.4, RC],
        // arm
        [0.8, 0.5, 0.65, 0.1, 0.1, 0.2, darken(RC, 0.2)],
        [0.8, 0.3, 0.6, 0.1, 0.3, 0.1, darken(RC, 0.2)],
        [0.8, 0.2, 0.6, 0.1, 0.1, 0.1, [20, 20, 20]],

        [0.6, 0.4, 0.05, 0.1, 0.3, 0.1, RC],
        [0.6, 0.5, 0.3, 0.1, 0.1, 0.4, RC],

        // belly
        [0.5, 0.5, 0.6, 0.4, 0.4, 0.6, RC],
        // head
        [0.5, 0.5, 1.0, 0.2, 0.2, 0.2, RC]
        ];
        if (d[0]>0||d[1]>0) x.push([0.5, 0.4, 1.0, 0.2, 0.001, 0.1, [255, 0, 0]])

        return x.concat([[0.2, 0.5, 0.65, 0.1, 0.1, 0.2, darken(RC, 0.2)],
        [0.2, 0.3, 0.6, 0.1, 0.3, 0.1, darken(RC, 0.2)],
        [0.2, 0.2, 0.6, 0.1, 0.1, 0.1, [20, 20, 20]]]);
}

const SHIELD = [
    [0.5, 0.1, 0.5, 1, 0.01, 1, [50, 50, 200, 0.5]]
]

function drawBullet(x, y, opacity = 1) {
    dBx(x - 0.2, y - 0.2, [200, 50, 50, opacity], 0.1, 0.1, 0.1, 0.6, true);
}

let mgd = (d, e) => {
    let g = c.createLinearGradient(camPos[0] - CW/2, camPos[1] - CH/2, camPos[0] - CW/2, camPos[1] + CH);
    g.addColorStop(0, d);
    g.addColorStop(1, e);
    return g;
}
let grd = mgd('#8f27a8','#33B');
let grd2 = mgd('rgba(28, 206,52, 0.5)', 'rgba(226, 217,3, 0.5)');

function splitText(text, size=40) {

    let t = text.split(' ');
    let res=[];
    let curr = '';

    t.map(t => {
        if ((curr + t).length >= size) {
            res.push(curr + ' ' + t);
            curr = '';
        } else {
            curr += ' ' + t;
        }
    })
    if (curr.length > 0) {
        res.push(curr);
    }
    return res;
}

function drawTextfield(text, r = 0, dx=0, dy=0, noFrame, size=20) {
    const poz = gPos(player.pos(r).x, player.pos(r).y)
    const layers = [
        [-5, -1, 'red'],
        [5, 3, 'green'],
        [-3, 3, 'blue'],
        [0,0,'#000']
    ];
    c.font = size + 'px Courier New';

    text = splitText(text);
    
    let textWid = Math.max.apply(Math, text.map(t => c.measureText(t).width));

    const padding = 20;
    const hei = (size+10) * text.length + 2*padding - 10;
    const wid = textWid + 2*padding;
    if (!noFrame) {
        layers.map(l => {
            c.beginPath();     
            c.rect(poz[0]-wid/2+dx + l[0], dx +poz[1] - padding + l[1] - hei/2, wid, hei);
            c.fillStyle = l[2];
            c.fill();
        });
    }

    text.map((t,i) => {

        const ls = [[-2, 0, 'red'], [3, 1, 'green'], [2, -1, 'blue'],[0,0, 'white']];
        ls.map(l => {
            c.fillStyle = l[2];
            c.fillText(t, dx+poz[0]-wid/2 + padding + l[0], dy+poz[1] + 20 + l[1] + i*30 - hei/2);
        });
    });
}


function drawMap(r) {
    const mapSize = 10;
    for(let i=player.x-mapSize;i<player.x+mapSize;i++) {
        for(let j=player.y-mapSize;j<player.y+mapSize;j++) {
            if (isTile(i,j)) {
                if (isBr(i,j)) {
                    dBx(i,j,[100, 100, 100, 0.9], 1, 1, 0.8, 0, false, grd2);
                } else {
                    dBx(i,j,[0, 0, 0, 0.9], 1, 1, 0.8, 0, false, grd2);
                }
            } else if (isPODS(i,j)) {
                const f = ((frame%10)/10 + r/100);
                dBx(i+0.4+f, j+0.4+Math.sin(f*Math.PI)*0.2, [50,255,0, 0.8], 0.2, 0.2, 0.2, false, false, 'rgba(0,0,0,0)');
                dBx(i+0.7+f*2, j+0.2*0.356, [20,255,50, 1], 0.2, 0.2, 0.2, false, false, 'rgba(0,0,0,0)');
            }
        }
    }
}

function drawPlayer(r) {
    player.render(r); // FIXME: move shield rendering to class
}

let stars = [];
for(let i=0;i<300;i++) {
    stars.push([
        getNoise(i*5.3423, i*0.64323),
        getNoise(i*10, i*12),
        getNoise(i * 23.41, i*414.421)
    ])
}

function drawBackground(r) {
    c.fillStyle=grd;
    const sm = gPos(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
    c.fillRect(sm[0], sm[1], CW, CH);
    for(var s of stars) {
        c.beginPath();
        c.arc(sm[0] + CW/2 + s[0]*CW, sm[1] + CH/2 + s[1]*CH,1.5 + 0.5*s[2],0,2*Math.PI);
        c.fillStyle = '#FFF';
        c.fill();
    }


    c.beginPath();
    let sunX = sm[0] + CW/2 + CW/3 - player.pos(r).y*0.5;
    let sunY = sm[1] + CH/3;
    let sunR =  CH/4;

    c.beginPath();
    c.arc(sunX, sunY, sunR,0,2*Math.PI);


    const sung = c.createLinearGradient(sunX,sunY-sunR,sunX,sunY+sunR);
    sung.addColorStop(0, 'rgb(255, 255, 30, 0.9)');
    sung.addColorStop(1, 'rgba(200, 30, 70, 0.8)');

    c.fillStyle = sung;
    c.fill();
    const slices=20;
    let j = 0;


    for(var i=-5;i<slices;i++) {
        j++;
        if(i%2==0) { continue }
        c.beginPath();
        c.rect(sunX-sunR,sunY+sunR/slices*i*j*0.1,2*sunR,sunR/slices*j*0.2);
        c.fillStyle=grd;
        c.fill();
    }
}

function drawEnemies(r) {
    pups.map(p => p.render(r));
    bots.map(b => b.render(r));
}

function drawBullets(r) {
    bullets.map(b => b.render(r));
}

function computeCollisions() {
    bullets.map(b => {
        [...bots, player].map(bot => {
            for(var i=0;i<BULLET_SPEED;i++) {
                if (b.x + b.a[0]*i === bot.x && b.y + b.a[1]*i === bot.y) {
                    // console.log('HIT');
                    if (!(bot.isSA && bot.d[0]*b.a[0] + bot.d[1]*b.a[1] < 0)) {
                        bot.hit();
                    }
                    b.togc = true;

                }
            }
        })
    })
    pups = pups.filter(p => {
        if (p.x === player.x && p.y === player.y) {
            player.collect(p);
            return false;
        }
        return true;
    })
}

function gc() {
    bots = bots.filter(b => !b.togc);
    bullets = bullets.filter(b => !b.togc);
}

function recomputeFrame() {
    let now = +(new Date());
    if (now > nextFrame) {
        if (MD.type === 'S') {
            bots.map(b => b.isHit = false)
            player.isHit = false;
            bots = bots.filter(b => {
                if (b.isDying) {
                    let r = rnd();
                    if(r < (5-player.health)*0.05) {
                        pups.push(new Health(b.x, b.y));
                    } else if(r < 0.7) {
                        pups.push(new Coin(b.x, b.y));
                    }
                }
                if (plD(b) > 40) {
                    return false;
                }
                return !b.isDying
            });
            pups = pups.filter(p => plD(p) < 40);
            computeCollisions();
            gc();

            if (bots.length < EN_COUNT && START_SPAWN) {
                let x = Math.floor(player.x + 5 + rnd() * 10);
                let y = Math.floor(player.y+ 5 + rnd()*15);
                if (isTile(x, y) && !isOc(x, y)) {
                    let i = Math.floor(ALF.length * rnd());
                    let C = ALF[i];
                    bots.push(new C(x, y));
                }
            }

            // updating all
            bots.map(b => b.update());
            bullets.map(b => b.update());

            player.update();
        }
        nextFrame = now + FRAME_LENGTH;
        frame++;
        computeTriggers(player.x, player.y);
        updateKeys()
        // FIXME: collision detection probably.
    }

    return (nextFrame - now) / FRAME_LENGTH;
}

let weirdAnimEndFrame = 0;
let weirdAnimSize = 0;
let weirdColor = 0;
let weirdAnimLen = 4;

let weirdFreezeFrame = 0;
let weirdFrame = null;
let weirdFrameX = 0;
let weirdFrameY = 0;

function drawPostprocess(r) {
    const pos = gPos(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
    let cn = CH;
    let f = getMultiframePosition(10, frame, r);
    for(var i=0;i<cn;i++) {
        if (i%2 == 0) { continue; }

        c.beginPath();
        c.fillStyle = 'rgba(0,0,0,'+ 0.6 + ')';
        c.rect(pos[0], pos[1] + CH/cn*i + frame%2, CW, CH/cn);
        c.fill();
    }

    if(rnd() > 0.9899 && weirdAnimEndFrame < frame) {
        weirdAnimLen = 2 + Math.floor(rnd() * 10); 
        weirdAnimEndFrame = frame + weirdAnimLen;
        weirdAnimSize = CH/80*rnd();
        weirdColor = Math.round(rnd()*4);
    }

    if (weirdAnimEndFrame > frame) {
        let clr = [0,0,0, 0.5];
        if (weirdColor > 0) {
            clr[weirdColor-1] = 200;
        }
        c.fillStyle = 'rgba(' + clr.join(',') + ')';
        c.rect(pos[0], pos[1] + CH * (1 -(weirdAnimEndFrame-frame)/weirdAnimLen), CW, weirdAnimSize);
        c.fill();
    }

    // Weird freeze
    if (rnd() > 0.95 && weirdFreezeFrame < frame) {
        weirdFreezeFrame = frame + 2;
        let posX = rnd() * CW*0.9;
        let posY = rnd() * CH*0.9;
        let width = Math.min(CW-posX, CW/3);
        let height = Math.min(CH-posY, CH/4);
        weirdFrame = c.getImageData(posX, posY, width, height);
        weirdFrameX = posX + (rnd()-0.5)*2*3;
        weirdFrameY = posY + (rnd()-0.5)*2*6;
    }

    if (weirdFreezeFrame > frame) {
        c.putImageData(weirdFrame, weirdFrameX, weirdFrameY);
    }
}

function drawHud(r) {
    const pos = gPos(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
    const height = 50;
    const padding = 20;
    c.beginPath();
    c.rect(pos[0], pos[1] + CH - s*3/2, CW, s*3/2);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fill();
    for(var i=0;i<5;i++) {
        conv(getHeart(i>=player.health), player.pos(r).x, player.pos(r).y, [1,0], -CW/2  + i*s+s, CH/2);
    }
    conv(getCoin(r), player.pos(r).x, player.pos(r).y, [1,0], +CW/2 - 2*s, CH/2);
    drawTextfield(''+player.coins, r, CW/2 - s/4*5, CH/2 - 20, true, 40);
}

let gp = null;

// window.addEventListener("gamepadconnected", function(e) {
//     gp = navigator.getGamepads()[e.gamepad.index];
//     console.log('gamepad', gp);
// });

function rGP(key) {
    let gp = navigator.getGamepads()[0];
    if (!gp) {
        return;
    }
    if (key === 'x') {
        return gp.buttons[1].pressed;
    }
    if (key === 'z') {
        return gp.buttons[0].pressed;
    }
    return darr.reduce((a, d,i) => a || (key === 'arrow'+d && dirs[i][0] === gp.axes[0] && dirs[i][1] === gp.axes[1]), 0);
}

function isKey(key) {
    return CT[key] || rGP(key);
}

function updateKeys() {
    if(isKey('x')) {
        player.fire();
    }
    player.isSA = SHIELD_ACTIVE && isKey('z');
    darr.map((x,i) => { if(isKey('arrow'+x)) player.move(dirs[i][0], dirs[i][1])});
}


function draw() {
    let fr = recomputeFrame();
    let gfr = fr;
    if (MD.type !== 'S') {
        fr = 0;
    }
    clear();
    camera.render(fr);
    drawBackground(fr);
    drawMap(fr);
    drawEnemies(fr);
    drawBullets(fr);
    drawPlayer(fr);
    if (MD.type === 'S') {
        drawHud(fr);
    }

    if (MD.type === 'T') {
        dTF(gfr);
    }

    if (MD.type === 'ST') {
        dsTr(gfr);
    }

    drawPostprocess(gfr);

    requestAnimationFrame(draw);
}

draw();
enTM([
    'Welcome to the cyberspace' + ' '.repeat(35) + '(PRESS X to continue)',
    'Game by' + ' '.repeat(10) + 'kulak',
    'You must be the new one.',
    'There has been a blackout in your world and everything went offline',
    "You've been transfered here to restore the connection",
    'Now you have to fight your way through the cyberspace!',
    'It\'s usually a calm place but we are experiencing glitch invasion right now so please proceed with caution.',
    'Head straight and try to cross the river',
    'Good luck!'
]);

document.addEventListener('keydown', (e) => {
    CT[e.key.toLowerCase()] = 1;
});

document.addEventListener('keyup', (e) => {
    CT[e.key.toLowerCase()] = 0;
})