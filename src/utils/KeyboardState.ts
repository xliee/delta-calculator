/**
 * KeyboardState.ts keep the current state of the keyboard.
 * It is possible to query it at any time. No need of an event.
 * This is particularly convenient in loop driven case, like in
 * 3D demos or games.
 *
 * Based on https://github.com/jeromeetienne/threex.keyboardstate
 */

interface KeyCodes {
  [key: number]: boolean;
}

interface Modifiers {
  [key: string]: boolean;
}

export class KeyboardState {
  private domElement: Document | HTMLElement;
  private keyCodes: KeyCodes = {};
  private modifiers: Modifiers = {};
  private _onKeyDown: (event: Event) => void;
  private _onKeyUp: (event: Event) => void;
  private _onBlur: () => void;

  // Static constants matching the original
  static MODIFIERS = ['shift', 'ctrl', 'alt', 'meta'];
  static ALIAS = {
    'left': 37,
    'up': 38,
    'right': 39,
    'down': 40,
    'space': 32,
    'pageup': 33,
    'pagedown': 34,
    'tab': 9,
    'escape': 27
  };

  constructor(domElement?: Document | HTMLElement) {
    this.domElement = domElement || document;

    // create callback to bind/unbind keyboard events
    this._onKeyDown = (event: Event) => {
      this._onKeyChange(event as KeyboardEvent);
    };
    this._onKeyUp = (event: Event) => {
      this._onKeyChange(event as KeyboardEvent);
    };

    // bind keyEvents
    this.domElement.addEventListener("keydown", this._onKeyDown, false);
    this.domElement.addEventListener("keyup", this._onKeyUp, false);

    // create callback to bind/unbind window blur event
    this._onBlur = () => {
      for (const prop in this.keyCodes) this.keyCodes[prop] = false;
      for (const prop in this.modifiers) this.modifiers[prop] = false;
    };

    // bind window blur
    window.addEventListener("blur", this._onBlur, false);
  }

  destroy(): void {
    // unbind keyEvents
    this.domElement.removeEventListener("keydown", this._onKeyDown, false);
    this.domElement.removeEventListener("keyup", this._onKeyUp, false);

    // unbind window blur event
    window.removeEventListener("blur", this._onBlur, false);
  }

  private _onKeyChange(event: KeyboardEvent): void {
    // update this.keyCodes
    const keyCode = event.keyCode;
    const pressed = event.type === 'keydown';
    this.keyCodes[keyCode] = pressed;

    // update this.modifiers
    this.modifiers['shift'] = event.shiftKey;
    this.modifiers['ctrl'] = event.ctrlKey;
    this.modifiers['alt'] = event.altKey;
    this.modifiers['meta'] = event.metaKey;
  }

  pressed(keyDesc: string): boolean {
    const keys = keyDesc.split("+");

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let pressed = false;

      if (KeyboardState.MODIFIERS.indexOf(key) !== -1) {
        pressed = this.modifiers[key];
      } else if (Object.keys(KeyboardState.ALIAS).indexOf(key) !== -1) {
        const keyCode = KeyboardState.ALIAS[key as keyof typeof KeyboardState.ALIAS];
        pressed = this.keyCodes[keyCode];
      } else {
        const keyCode = key.toUpperCase().charCodeAt(0);
        pressed = this.keyCodes[keyCode];
      }

      if (!pressed) return false;
    }
    return true;
  }  eventMatches(event: KeyboardEvent, keyDesc: string): boolean {
    const aliases = KeyboardState.ALIAS;
    const aliasKeys = Object.keys(aliases);
    const keys = keyDesc.split("+");

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let pressed = false;

      if (key === 'shift') {
        pressed = event.shiftKey;
      } else if (key === 'ctrl') {
        pressed = event.ctrlKey;
      } else if (key === 'alt') {
        pressed = event.altKey;
      } else if (key === 'meta') {
        pressed = event.metaKey;
      } else if (aliasKeys.indexOf(key) !== -1) {
        pressed = event.keyCode === aliases[key as keyof typeof aliases];
      } else if (event.keyCode === key.toUpperCase().charCodeAt(0)) {
        pressed = true;
      }

      if (!pressed) return false;
    }
    return true;
  }
}
