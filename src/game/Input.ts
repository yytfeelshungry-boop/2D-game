import { audio } from './Audio';

export class Input {
  keys: { [key: string]: boolean } = {};
  justPressed: { [key: string]: boolean } = {};

  constructor() {
    window.addEventListener('keydown', (e) => {
      audio.init();
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('touchstart', () => {
      audio.init();
    }, { passive: true });

    window.addEventListener('mousedown', () => {
      audio.init();
    }, { passive: true });
  }

  isDown(code: string) {
    return !!this.keys[code];
  }

  isJustPressed(code: string) {
    if (this.justPressed[code]) {
      this.justPressed[code] = false;
      return true;
    }
    return false;
  }

  simulateKeyDown(code: string) {
    if (!this.keys[code]) {
      this.justPressed[code] = true;
    }
    this.keys[code] = true;
  }

  simulateKeyUp(code: string) {
    this.keys[code] = false;
  }

  update() {
    // Clear justPressed after the frame
    this.justPressed = {};
  }
}
