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

let playerShieldOn = false;

const FRAME_LENGTH = 200;
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
    }

    render(r) {
        console.log(r);
        let dx = (r)*this.a[0];
        let dy = (r)*this.a[1];
        return convertToDraw(ROBOT_SCHEME, this.x - dx, this.y - dy);
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
            }
        }
    }
}

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

function getPosition(x, y, dx=0, dy=0) {
    return [
        (x - y)*s + dx,
        (x + y)*s/2 + dy
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
]

function drawRobot(x, y) {
    return convertToDraw(ROBOT_SCHEME, x, y);
}

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
    for(let i=player[0]-20;i<player[0]+20;i++) {
        for(let j=player[1]-20;j<player[1]+20;j++) {
            if (isTile(i,j)) {
                drawBox(i,j,[50, 50, 50, 0.8], 1, 1, 0.2, 0, false, grd2);
            }
        }
    }
}
let player = [0, 0];

function drawPlayer() {

    // drawRobot(player[0]-2, player[1]);
    // drawRobot(player[0]-1, player[1]);
    drawRobot(player[0], player[1]);
    if (playerShieldOn) {
        drawBox(player[0] - 0.3, player[1]-0.1, [80,80,200, 0.5], 0.8, 0.05, 0.8, 1.2);
    }
    // drawRobot(player[0]+1, player[1]);
    // drawRobot(player[0]+2, player[1]);
    // drawRectangle(player[0], player[1], 'green', 2, 2);
}

function drawBackground() {
    c.fillStyle=grd;
    const sm = getPosition(player[0], player[1], -CW/2, -CH/2);
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
        nextFrame = now + FRAME_LENGTH;
        // FIXME: collision detection probably.
    }

    return (nextFrame - now) / FRAME_LENGTH;
}


function draw() {
    const currentFrameMoment = recomputeFrame();
    clear();
    drawBackground();
    drawMap();
    drawEnemies(currentFrameMoment);
    drawBullets(currentFrameMoment);
    drawPlayer();
    // drawRobot(0, 0);

    requestAnimationFrame(draw);
}

draw();

document.addEventListener('keyup', function(e) {
    if (e.key === 'z') {
        playerShieldOn = false;
    }
});

document.addEventListener('keydown', function(e) {
    console.log(e.key);
    switch(e.key) {
        case 'ArrowDown':
            if (isTile(player[0], player[1] + 1)) {
                player[1]++;
                c.translate(s, -s/2)
            }
            break;
        case 'ArrowUp':
            if (isTile(player[0], player[1] - 1)) {   
                player[1]--;
                c.translate(-s, s/2)
            }
            break;
        case 'ArrowLeft':
            if (isTile(player[0] - 1, player[1])) {   
                player[0]--;
                c.translate(s, s/2);
            }
            break;
        case 'ArrowRight':
            if (isTile(player[0] + 1, player[1])) {
                player[0]++;
                c.translate(-s, -s/2);
            }
            break;
        case 'X':
        case 'x':
            bullets.push(new Bullet(player[0], player[1], [0, 1]));
            break;
        case 'z':
            playerShieldOn = true;
            break;
        case '+':
            changeScale(s+10);
            break;
        case '-':
        changeScale(s-10);
    }
})