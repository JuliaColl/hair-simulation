
export class InputManager {
    static staticProperty = 'someValue';
    static isKeyW;
    static isKeyS;
    static isKeyA;
    static isKeyD;
    static isKeyQ;
    static isKeyE;
    static isSpace;

    static onKey(e, bool) {
        if (e.code === 'KeyW')
            this.isKeyW = bool;

        else if (e.code === 'KeyS')
            this.isKeyS = bool;

        else if (e.code === 'KeyA')
            this.isKeyA = bool;

        else if (e.code === 'KeyD')
            this.isKeyD = bool;

        else if (e.code === 'KeyQ')
            this.isKeyQ = bool;

        else if (e.code === 'KeyE')
            this.isKeyE = bool;

        else if (e.code === 'Space')
            this.isSpace = bool;

    }
  }