

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
    }

    start() {

    }

    loop() {
        console.log('Loop');
        requestAnimationFrame(() => this.loop());
    }
}