const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d');
canvas.width = document.body.offsetWidth;
canvas.height = document.body.offsetHeight;
c.translate(canvas.width/2, canvas.height/2);
let fixSize = 2;

let s = 150;
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

function drawTop(x, y, color, w=1, h=1, dx = 0, dy = 0) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy))
    c.lineTo.apply(c, getPosition(x-w, y, dx, dy));
    c.lineTo.apply(c, getPosition(x-w,y-h, dx, dy));
    c.lineTo.apply(c, getPosition(x, y-h, dx, dy));
    c.lineWidth = fixSize;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.fill();
    c.stroke();
}

function drawRight(x, y, color, w, h, dx = 0, dy = 0) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy));
    let p = getPosition(x, y-w, dx, dy);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = getPosition(x, y, dx, dy);
    p[1] += h*s;
    c.lineTo.apply(c, p, dx, dy);
    c.fillStyle = color;
    c.fill();
    c.lineWidth = fixSize;
    c.strokeStyle = color;
    c.stroke();
}

function drawLeft(x, y, color, w, h, dx = 0, dy = 0) {
    c.beginPath();
    c.moveTo.apply(c, getPosition(x,y, dx, dy));
    let p = getPosition(x-w, y, dx, dy);
    c.lineTo.apply(c, p);
    p[1] += h*s;
    c.lineTo.apply(c, p);
    p = getPosition(x,y, dx, dy);
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


function drawBox(x, y, color = [128,128,128], w = 1, d = 1, h = 1, raise = 0, calculateFromTop) {
    let dy = 0;
    if (calculateFromTop) {
        dy = -h*s;
    }
    dy -= raise * s;
    drawTop(x, y, col(color), w, d, 0, dy);
    drawLeft(x, y, col(lighten(color, ALPHA)), w, h, 0, dy);
    drawRight(x, y, col(darken(color, ALPHA)), d, h, 0, dy);
}


function drawRectangle(x, y, color, w = 1, h = 1) {
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
    // drawBox(x-0.1, y-0.2, [100,100,100], 0.1, 0.1, 0.5, 0, true);

    // drawBox(x-0.9, y-0.2, [100,100,100], 0.1, 0.1, 0.5, 0, true);

    // drawBox(x-0.2, y-0.2, [100, 100, 100], 0.1, 0.3, 0.1);
    // drawBox(x - 0.9, y-0.2, [100,100, 100], 0.1, 0.3, 0.1);

    // FIXME: make drawLeg
    drawBox(x - 0.3, y - 0.2, [100, 100, 100], 0.1, 0.3, 0.1);
    drawBox(x - 0.3, y - 0.4, [100, 100, 100], 0.1, 0.1, 0.5, 0, true);


    // arm 2
    drawBox(x - 0.8, y - 0.1, [80, 80, 80], 0.1, 0.3, 0.1, 0.6, true);
    drawBox(x - 0.8, y - 0.0, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true);
    drawBox(x - 0.8, y - 0.3, [80, 80, 80], 0.1, 0.1, 0.2, 0.7, true);

    // body
    drawBox(x - 0.7, y - 0.2, [100,100,100], 0.1, 0.3, 0.1);
    drawBox(x - 0.7, y - 0.4, [100, 100, 100], 0.1, 0.1, 0.5, 0, true);
    drawBox(x - 0.3, y - 0.2, [100,100,100], 0.6, 0.6, 0.6, 0.5, true);

    drawBox(x - 0.4, y - 0.3, [100,100,100], 0.4, 0.4, 0.4, 1.1, true); // head
    drawBox(x - 0.45, y - 0.29, [0,0,0], 0.3, 0.01, 0.2, 1.2, true); // face

    // eyes
    drawBox(x - 0.75, y - 0.39, [0,0,200], 0.05, 0.01, 0.05, 1.2, true); // eye1
    drawBox(x - 0.6, y - 0.39, [0,0,200], 0.05, 0.01, 0.05, 1.2, true); // eye2

    
    // arm 1
    drawBox(x - 0.2, y - 0.2, [80, 80, 80], 0.1, 0.3, 0.1, 0.6, true);
    drawBox(x - 0.2, y - 0.1, [20, 20, 20], 0.1, 0.1, 0.1, 0.6, true);
    drawBox(x - 0.2, y - 0.4, [80, 80, 80], 0.1, 0.1, 0.2, 0.7, true);
}

function drawMap() {
    for(let i=-10;i<0;i++) {
        drawBox(i,i,[200,128,128], 1, 1, 0.2);
    }
}
let player = [0, 0];

function drawPlayer() {
    drawRobot(player[0], player[1]);
    // drawRectangle(player[0], player[1], 'green', 2, 2);
}


function draw() {
    console.log('draw')
    clear();
    drawMap();
    drawPlayer();
    // drawRobot(0, 0);

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