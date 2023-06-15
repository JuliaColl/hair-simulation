
export class InputManager {
    static staticProperty = 'someValue';
    static isKeyW = false;
    static isKeyS = false;
    static isKeyA = false;
    static isKeyD = false;
    static isKeyQ = false;
    static isKeyE = false;
    static isSpace = false;

    static onKey(e, bool) {
        if (e.code === 'KeyW')
            InputManager.isKeyW = bool;

        else if (e.code === 'KeyS')
            InputManager.isKeyS = bool;

        else if (e.code === 'KeyA')
            InputManager.isKeyA = bool;

        else if (e.code === 'KeyD')
            InputManager.isKeyD = bool;

        else if (e.code === 'KeyQ')
            InputManager.isKeyQ = bool;

        else if (e.code === 'KeyE')
            InputManager.isKeyE = bool;

        else if (e.code === 'Space')
            InputManager.isSpace = bool;

    }
  }