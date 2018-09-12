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
        return isBridge(x, y);
    }

    return (x >= -52 && x <= -49 && y >=8 && y <= 11) || (getNoise(x,y) < 0.2 || getNoise(x, y) > 0.8) && !(2*x>3*y) && (2*x*y<x+y+10 ) && !(x-30)*(x-30)+(y-10)*(y-10)>1;
}

function isBridge(x, y) {
    let ax = Math.abs(x) % 60;
    let ay = Math.abs(y) % 60;
    return (ax > 57 || ay > 57) && (ax % 19 > 17 || ay%19 > 17);
}

function isPartOfDataStream(x, y) {
    return y > 8 && y < 12;
}

let currentMode = {
    type: 'STAGE',
};

function enterTextMode(text, noscale) {
    let t = text.shift();
    let animationFinishFrame = frame + 10;
    if (noscale) {
        animationFinishFrame = frame - 1;
    }
    currentMode = {
        type: 'TEXT',
        animationFinishFrame: animationFinishFrame,
        currentText: '',
        fullText: t,
        nextLetterTime: 0,
        nextText: text
    }
};

function enterStageTransitionMode() {
    currentMode = {
        type: 'STAGE_TRANSITION',
        fullScaleOut: frame + 5,
        initialScale: s
    }
}

function enterStageMode() {
    currentMode = {
        type: 'STAGE'
    }
}

function drawStageTransition(r) {
    if (frame > currentMode.fullScaleOut) {
        changeScale(defaultScale);
        enterStageMode();
    } else {
        let fr = (currentMode.fullScaleOut - frame)/5 + r/(5*5);
        changeScale(defaultScale + fr * (currentMode.initialScale - defaultScale));
    }
}

function drawTextFrame(r) {
    if (currentMode.currentText.length === currentMode.fullText.length && CT.x) {
        // FIXME: wait for the close sign.
        if (currentMode.nextText.length) {
            enterTextMode(currentMode.nextText, true);
        } else if (!player.health) {
            location.reload();
        } else {
            enterStageTransitionMode();
        }
        return;
    } else if (frame <= currentMode.animationFinishFrame) {
        let fr = (10 - (currentMode.animationFinishFrame - frame))/10 + r/100;
        changeScale(defaultScale + fr * 80);
        return;
    } else if (currentMode.nextLetterTime < (frame + r) && currentMode.currentText.length !== currentMode.fullText.length) {
        currentMode.currentText += currentMode.fullText[currentMode.currentText.length];
        currentMode.nextLetterTime = 0;
    }

    drawTextfield(currentMode.currentText);
}

class Obj {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.a = [0,0];
        this.d = [0, 1];
        this._scheme = null;
    }

    preRender(scheme, t) {
        return scheme;
    }

    render(t) {
        let scheme = this._scheme(t).slice().map(s => s.slice());
        scheme = this.preRender(scheme, t);

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
        return convertDrawNew(scheme, a.x, a.y, this.d);
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
        this._scheme = () => getHeart();
        this.ct = 'H';
    }
}

class Coin extends Obj {
    constructor(x,y) {
        super(x,y);
        this._scheme = getCoin;
        this.ct = 'C';
    }
}

function playerDistance(b) {
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
        return this.a[0] + this.a[1] !== 0;
    }

    update() {
        this.a = [0,0];
        if (Math.random() < this._moveRatio) {
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

        if (Math.random() < this._fireRatio) {
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
        shotSound(playerDistance(this));
    }    
}


// BOT CLASS
class Bot extends Enemy {
    constructor(x, y) {
        super(x,y);
        this.health = 3;
        this._scheme = getRobot;
        this._moveRatio = 0.5;
        this._fireRatio = 0.05;
    }

    preRender(scheme, r) {

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
        return scheme;
    }
}

class Agrobot extends Bot {
    preRender(s, r) {
        let b = super.preRender(s, r);
        return b.map(x => {
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
                console.log('Same line');
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
        this._scheme = (r) => getSwarm(r);
    }

    fire() {
        dirs.map(d => bullets.push(new Bullet(this.x, this.y, d)));
    }
}

class Virus extends Enemy {
    constructor(x,y) {
        super(x,y);
        this._scheme = getVirus;
        this._moveRatio = 0.1;
    }
}


const ALLOWED_FOES = [Virus];

let EN_COUNT = 10;
let SHIELD_ACTIVE = false;

const triggers = [
    {
        t: (x, y) => y === 11,
        used: false,
        trigger: () => {
            lead.volNext(3);
            enterTextMode([
                'This is our main datastream.',
                'All the information on the internet runs through here',
                'Behind this bridge you can find many unpleastant things',
                'Viruses, bots, swarms of data',
                'Be prepared',
                'You can use your gun by pressing X',
            ]);
            START_SPAWN = true;
        }
    },
    {
        t: (x, y) => x === -20,
        used: false,
        trigger: () => {
            enterTextMode([
                'This is a coin',
                'It is the key to restore online connection',
                'Do not ask me how does it work, just trust me',
                'Gather coins to unlock the way to freedom',
                'But reacher you are, the stronger are the opponents'
            ])
        }
    },
    {
        t: () => player.coins >= 5,
        used: false,
        trigger: function() {
            ALLOWED_FOES.push(Bot);
            EN_COUNT = 15;
            enterTextMode([
                'You have collected some coins',
                'Now you can face more powerful foes.'
            ]);
        }
    },
    {
        t: () => player.coins >= 25,
        used: false,
        trigger: () => {
            EN_COUNT = 20;
            SHIELD_ACTIVE = true;
            enterTextMode([
                'Now you can meet more agresive bots.',
                'They have been infected and are even less friendly',
                'They will shoot you on site',
                'But I have upgraded your avatar with the shield',
                'Press Z to activate it',
                'It works in the single direction though.',
                'Be quick or be dead!'
            ]);
            ALLOWED_FOES.push(Agrobot);
        },
    },
    {
        t: () => player.coins >= 40,
        used: false,
        trigger: () => {
            EN_COUNT = 30;
            enterTextMode([
                'You are getting rich quite fast',
                'Remember, gather 100 coins and face the final boss',
                'But before that, the wild swarm can appear',
                'It shoot in all directions'
            ]);
            ALLOWED_FOES.push(Swarm);
            ALLOWED_FOES.shift();
        }
    },
    {
        t: () => !player.health,
        trigger: function() {
            enterTextMode(['G A M E  O V E R', 'You have gathered ' + player.coins + ' coins!']);
        }
    }
]


function computeTriggers(x, y) {
    triggers.forEach(t => {
        if (t.t(x,y) && !t.used) {
            t.trigger();
            t.used = true;
        }
    });
}

class Player extends Enemy {
    constructor(x, y) {
        super(x, y);
        this._nextA = [0, 0];
        this.health = 5;
        this.isShieldActive = false;
        this.coins = 0;
        this._scheme = (r) => getPlayer(this.d);
    }
    preRender(scheme, r) {

        if (this.isShieldActive) {
            return [...scheme, ...SHIELD];
        }
        return scheme;
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

    onHealthChange(h) {
        let v = 0.1 * (5-h);
        lead2.vol(v);
        lead3.vol(v);
    }

    collect(c) {
        if (this.isDying) {
            return;
        }

        if (c.ct === 'H' && this.health < 5) {
            this.health++;
            this.onHealthChange(this.health);
        }
        if (c.ct === 'C') {
            this.coins++;
        }
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

var a = new (window.AudioContext || window.webkitAudioContext)();
var g = a.createGain();
var o = a.createOscillator();
o.type = 'square';
o.connect(g);
g.connect(a.destination);
o.start();
g.gain.linearRampToValueAtTime(0, a.currentTime + 0.01);

function shotSound(distance) {
    if (distance > 10) {
        return;
    }
    g.gain.setValueAtTime(80, a.currentTime);
    o.frequency.setValueAtTime(300, a.currentTime)
    o.frequency.linearRampToValueAtTime(140, a.currentTime + 0.1)
    g.gain.linearRampToValueAtTime(0, a.currentTime + 0.1);

    // setTimeout(() => {
    //     o.stop();
    //     o.disconnect();
    // }, 1000);
}


var aa = new (window.AudioContext || window.webkitAudioContext)();
var gg = aa.createGain();
var oo = aa.createOscillator();
oo.type = 'square';
oo.connect(gg);
gg.connect(aa.destination);
oo.start();
gg.gain.linearRampToValueAtTime(0, a.currentTime + 0.01);

function explosionSound() {
    gg.gain.setValueAtTime(100, a.currentTime);
    for(var i=0;i<10;i++) {
        // oo.frequency.linearRampToValueAtTime(140, a.currentTime + i*0.03)
        oo.frequency.linearRampToValueAtTime(50, a.currentTime + i*0.01 + 0.01)
    }
    // o.frequency.linearRampToValueAtTime(300, a.currentTime + 0.7)
    gg.gain.linearRampToValueAtTime(0, a.currentTime + 0.15);
}

// window.ss = shotSound

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

// const mus = new Music([].concat(bass(440/4), bass(400/4), bass(470/4), bass(440/4)));
// mus.start();

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

const dr = 4;
const sg = 0.5;

// const st = new Music([
//     [duration, 65.4], // c e g b c
//     [duration, 82.4],
//     [duration, 98.0],
//     [duration, 123.5],
//     [duration, 130.8],
//     [duration, 123.5],
//     [duration, 98.0],
//     [duration, 82.4]
// ])

// st.start();

const MS1 = [
    [dr-sg, 65.4], // c
    [sg, 0],
    [dr, 65.4], // c
    [4*dr, 0], // pause
    [dr-sg, 77.78], // Eb
    [sg, 0],

    [dr-sg, 77.78],
    [2*dr, 0],
    [dr-sg, 68.29], // Db
    [sg, 0],
    [dr, 68.29], // Db
    [2*dr, 0], // pause
];

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

// NEW MUSIC
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

// const bs2 = new Music(MS1, 3);
// bs2.start();


// const bs3 = new Music(MS1, -3);
// bs3.start();


function isOccupied(x, y) {
    return false;

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

function getPosition(x, y, dx=0, dy=0) {
    return [
        (x - y)*s + dx,
        (x + y)*s/window.S + dy
    ]
}

function drawTop(x, y, color, w=1, h=1, dx = 0, dy = 0, borderColor) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy))
    c.lineTo.apply(c, getPosition(x-w, y, dx, dy));
    c.lineTo.apply(c, getPosition(x-w,y-h, dx, dy));
    c.lineTo.apply(c, getPosition(x, y-h, dx, dy));
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
    if (borderColor) {
        c.lineWidth = fixSize;
        c.strokeStyle = borderColor;
        c.stroke();
    }
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


function drawBox(x, y, color = [128,128,128], w = 1, d = 1, h = 1, raise = 0, calculateFromTop = false, borderColor, ddx = 0, ddy = 0) {
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

function convertToDraw(rec, x, y, dir = [0, 1]) {
    rec.map(r => {
        r = r.slice();
        r[0] = x - r[0];
        r[1] = y - r[1];
        drawBox.apply(null, r);
    })
}


function convertDrawNew(rec, x, y, dir, dx = 0, dy = 0) { // [x, y, z, w, d, h, col]
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

    const f = (x) => {
        const p = getPosition(x[0] + x[3]/2, x[1]+x[4]/2);
        return p[2] + p[0] + p[1];
    }

    const orderFn = (a, b) => {
        let res = [-1,-1,1];
        for(var i=0;i<3;i++) {
            if (a[0+i] - a[3+i] >= b[0+i] + b[3+i]) {
                return -res[i];
            } else if (b[0+i] - b[3+i] >= a[0+i] + a[3+i]) {
                return res[i];
            }
        }
        return -1;
    }

    // const f = x => x[0];

    rec = rec.sort(orderFn);


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
        drawBox(x - xx + w/2, y - yx + d/2, col, w, d, h, z + h/2, false, false, dx, dy);
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

const wtf_SCHEME_NEW = [
    // [0.5,0.5,0.5, 1, 1, 1, RC],
    // [0.5, 0.5, 1.25, 0.5, 0.5, 0.5, [255, 0, 0]]
    [0.3, 0.45, 0.05, 0.05, 0.2, 0.05, RC],
    [0.3, 0.5, 0.3, 0.05, 0.05, 0.4, RC],

    [0.6, 0.45, 0.05, 0.05, 0.2, 0.05, RC],
    [0.6, 0.5, 0.3, 0.05, 0.05, 0.4, RC],

    // belly
    [0.5, 0.5, 0.6, 0.2, 0.2, 0.4, RC],
    // head
    [0.5, 0.5, 1.0, 0.2, 0.2, 0.2, RC],
    [0.5, 0.4, 1.0, 0.2, 0.001, 0.1, [255, 0, 0]]
]

const PC = [200, 180, 150]

function getPlayer(dir) {
    const p = [
        [0.65, 0.4, 0.4, 0.05, 0.2,0.05, [90,70,200]],
        // [0.5,0.5,0.5, 1, 1, 1, RC],
        // [0.5, 0.5, 1.25, 0.5, 0.5, 0.5, [255, 0, 0]]
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
        dirs = [[1,0], [0,-1]];
    }
    if (dir[1] < 0) {
        dirs = [[-1, 0], [0,1]];
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
        x[2] += Math.random()*0.4;
        x[6] = x[6].slice();
        x[6][0] += Math.random()*10;
        x[6][1] += Math.random()*20;
        x[6][2] -= Math.random()*10;
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


// const ROBOT_SCHEME = [
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
function getRobot() { // FIXME: add arm
        return [
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
}

const SHIELD = [
    [0.5, 0.1, 0.5, 1, 0.01, 1, [50, 50, 200, 0.5]]
]

function drawBullet(x, y, opacity = 1) {
    drawBox(x - 0.2, y - 0.2, [200, 50, 50, opacity], 0.1, 0.1, 0.1, 0.6, true);
}

function drawGoal(x, y, glow) { // FIXME: use it at the end of the game.
    const g = Math.sin(frame%10/10+glow/100 * 2*Math.PI);
    drawBox(x, y, [20+g*100, 200, 20+g*100, 0.7-g*0.5], 1, 1, 1,1);
}


const grd = c.createLinearGradient(camPos[0] - CW/2, camPos[1] - CH/2, camPos[0] - CW/2, camPos[1] + CH);
grd.addColorStop(0, '#8f27a8');
grd.addColorStop(1, '#33B');

const grd2 = c.createLinearGradient(camPos[0] - CW/2, camPos[1] - CH/2, camPos[0] - CW/2, camPos[1] + CH);
grd2.addColorStop(0, 'rgba(28, 206,52, 0.5)');
grd2.addColorStop(1, 'rgba(226, 217,3, 0.5)');


function splitText(text, size=40) {

    let t = text.split(' ');
    let res=[];
    let curr = '';

    t.forEach(t => {
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
    const poz = getPosition(player.pos(r).x, player.pos(r).y)
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
                if (isBridge(i,j)) {
                    drawBox(i,j,[100, 100, 100, 0.9], 1, 1, 0.8, 0, false, grd2);
                } else {
                    drawBox(i,j,[0, 0, 0, 0.9], 1, 1, 0.8, 0, false, grd2);
                }
            } else if (isPartOfDataStream(i,j)) {
                const f = ((frame%10)/10 + r/100);
                drawBox(i+0.4+f, j+0.4+Math.sin(f*Math.PI)*0.2, [50,255,0, 0.8], 0.2, 0.2, 0.2, false, false, 'rgba(0,0,0,0)');
                drawBox(i+0.7+f*2, j+0.2*0.356, [20,255,50, 1], 0.2, 0.2, 0.2, false, false, 'rgba(0,0,0,0)');
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
    const sm = getPosition(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
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


    const count = 500;

    let u = 2;
    while(u--) {
        // console.log('Drawing', u);
        let posX = sm[0];
        let posY = sm[1] + CH/5*2;

        c.beginPath();
        c.moveTo(posX - 100, posY + CH / 2);
        c.fillStyle=u >= 1 ?'#BD3CC0' : 'rgba(50, 50, 50, 0.4)';
        c.strokeStyle = 'red';
        posX -= u<1 ? 10 : 0;
        posY += u<1 ? 10 : 0;
        // Mountains - FIXME: probably remove it
        for(var i=0;i<count;i++) {
            let fr = Math.floor(frame/10)
            posX += 1/count*CW;
            let df = -i/count*CH/1000 + getNoise((fr+i)*4543.54, (i+fr)*4.13) * (CH / 10) *(i%15)/15;
            c.lineTo(posX + r*1/count*CW, posY + df);
        }
        c.lineTo(posX+CW/2, sm[1] + CH);
        c.stroke();
    }


    // SOME RETRO TEXT
    c.font = '30px Arial';
    c.fillStyle ='#000';
    c.fillText('' + player.x + ','+ player.y,sm[0] + 33, sm[1] + 43)
    c.fillStyle = '#FFF';
    c.fillText('' + player.x + ','+ player.y,sm[0] + 30, sm[1] + 40)

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
                    if (!(bot.isShieldActive && bot.d[0]*b.a[0] + bot.d[1]*b.a[1] < 0)) {
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
        if (currentMode.type === 'STAGE') {
            bots.map(b => b.isHit = false)
            player.isHit = false;
            bots = bots.filter(b => {
                if (b.isDying) {
                    let r = Math.random();
                    if(r < (5-player.health)*0.05) {
                        pups.push(new Health(b.x, b.y));
                    } else if(r < 0.7) {
                        pups.push(new Coin(b.x, b.y));
                    }
                }
                if (Math.abs(player.x -b.x)+Math.abs(player.y - b.y) > 40) {
                    return false;
                }
                return !b.isDying
            });
            computeCollisions();
            gc();

            if (bots.length < EN_COUNT && START_SPAWN) {
                let x = Math.floor(player.x + 5 + Math.random() * 10);
                let y = Math.floor(player.y+ 5 + Math.random()*15);
                if (isTile(x, y)) {
                    let i = Math.floor(ALLOWED_FOES.length * Math.random());
                    let C = ALLOWED_FOES[i];
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
    const pos = getPosition(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
    let cn = CH;
    let f = getMultiframePosition(10, frame, r);
    for(var i=0;i<cn;i++) {
        if (i%2 == 0) { continue; }

        c.beginPath();
        c.fillStyle = 'rgba(0,0,0,'+ 0.6 + ')';
        c.rect(pos[0], pos[1] + CH/cn*i + frame%2, CW, CH/cn);
        c.fill();
    }

    if(Math.random() > 0.9899 && weirdAnimEndFrame < frame) {
        weirdAnimLen = 2 + Math.floor(Math.random() * 10); 
        weirdAnimEndFrame = frame + weirdAnimLen;
        weirdAnimSize = CH/80*Math.random();
        weirdColor = Math.round(Math.random()*4);
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
    if (Math.random() > 0.95 && weirdFreezeFrame < frame) {
        weirdFreezeFrame = frame + 2;
        let posX = Math.random() * CW*0.9;
        let posY = Math.random() * CH*0.9;
        let width = Math.min(CW-posX, CW/3);
        let height = Math.min(CH-posY, CH/4);
        weirdFrame = c.getImageData(posX, posY, width, height);
        weirdFrameX = posX + (Math.random()-0.5)*2*3;
        weirdFrameY = posY + (Math.random()-0.5)*2*6;
    }

    if (weirdFreezeFrame > frame) {
        c.putImageData(weirdFrame, weirdFrameX, weirdFrameY);
    }
}

function drawHud(r) {
    const pos = getPosition(player.pos(r).x, player.pos(r).y, -CW/2, -CH/2);
    const height = 50;
    const padding = 20;
    c.beginPath();
    c.rect(pos[0], pos[1] + CH - s*3/2, CW, s*3/2);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fill();
    for(var i=0;i<5;i++) {
        convertDrawNew(getHeart(i>=player.health), player.pos(r).x, player.pos(r).y, [1,0], -CW/2  + i*s+s, CH/2);
    }
    convertDrawNew(getCoin(r), player.pos(r).x, player.pos(r).y, [1,0], +CW/2 - 2*s, CH/2);
    drawTextfield(''+player.coins, r, CW/2 - s/4*5, CH/2 - 20, true, 40);
}

function updateKeys() {
    if(CT.x) {
        player.fire();
    }
    player.isShieldActive = SHIELD_ACTIVE && CT.z;
    ['left','right','down','up'].map((x,i) => { if(CT['arrow'+x]) player.move(dirs[i][0], dirs[i][1])});
}


function draw() {
    let currentFrameMoment = recomputeFrame();
    let globalFrameMoment = currentFrameMoment;
    if (currentMode.type !== 'STAGE') {
        currentFrameMoment = 0;
    }
    clear();
    camera.render(currentFrameMoment);
    drawBackground(currentFrameMoment);
    drawMap(currentFrameMoment);
    drawEnemies(currentFrameMoment);
    drawBullets(currentFrameMoment);
    drawPlayer(currentFrameMoment);
    // drawGoal(0, 0, currentFrameMoment);
    if (currentMode.type === 'STAGE') {
        drawHud(currentFrameMoment);
    }

    if (currentMode.type === 'TEXT') {
        drawTextFrame(globalFrameMoment);
    }

    if (currentMode.type === 'STAGE_TRANSITION') {
        drawStageTransition(globalFrameMoment);
    }

    drawPostprocess(globalFrameMoment);

    requestAnimationFrame(draw);
}

draw();
enterTextMode([
    'Welcome to the cyberspace',
    'You must be the new one.',
    'There have been a blackout in your world and everything went offline',
    'Now you have to fight your way through the cyberspace to restore the connection!',
    'It\'s usually a calm place but we are experiencing glitch invasion right now so please proceed with causion.',
    'Good luck!'
]);

document.addEventListener('keydown', (e) => {
    CT[e.key.toLowerCase()] = 1;
});

document.addEventListener('keyup', (e) => {
    CT[e.key.toLowerCase()] = 0;
})