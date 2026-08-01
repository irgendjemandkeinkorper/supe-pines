// DOM and Browser environment mocks for testing
export const elementStore = new Map();

export function resetDOM() {
  elementStore.clear();
}

function createMockElement(id, tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    _value: '',
    _checked: false,
    _textContent: '',
    _innerHTML: '',
    _open: false,
    _style: { display: '' },
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
    get checked() { return this._checked; },
    set checked(c) { this._checked = !!c; },
    get textContent() { return this._textContent; },
    set textContent(t) { this._textContent = String(t); },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(h) {
      this._innerHTML = String(h);
      // Auto-populate elements found in innerHTML to make selectors work
      const idRegex = /id=["']([^"']+)["']/g;
      let match;
      while ((match = idRegex.exec(this._innerHTML)) !== null) {
        const foundId = match[1];
        if (!elementStore.has(foundId)) {
          elementStore.set(foundId, createMockElement(foundId));
        }
        const el = elementStore.get(foundId);

        // Extract value
        const valRegex = new RegExp(`id=["']${foundId}["'][^>]*value=["']([^"']*)["']`);
        const valMatch = valRegex.exec(this._innerHTML);
        if (valMatch) {
          el.value = valMatch[1];
        }

        // Extract type
        const typeRegex = new RegExp(`id=["']${foundId}["'][^>]*type=["']([^"']*)["']`);
        const typeMatch = typeRegex.exec(this._innerHTML);
        if (typeMatch) {
          el.type = typeMatch[1];
        }
      }
    },
    get open() { return this._open; },
    set open(o) { this._open = !!o; },
    get style() { return this._style; },
    set style(s) { Object.assign(this._style, s); },
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
    },
    setAttribute: () => {},
    getAttribute: () => {},
    scrollIntoView: () => {},
    querySelector: () => createMockElement('nested-dummy'),
  };
}

globalThis.document = {
  getElementById: (id) => {
    if (!elementStore.has(id)) {
      elementStore.set(id, createMockElement(id));
    }
    return elementStore.get(id);
  },
  querySelector: (sel) => {
    if (sel.startsWith('#')) {
      return globalThis.document.getElementById(sel.substring(1));
    }
    if (sel.includes('[name="close-el"]:checked')) {
      if (elementStore.has('close-el-checked')) {
        return elementStore.get('close-el-checked');
      }
      // Look inside scr-close innerHTML for checked radio
      const closeHTML = elementStore.get('scr-close')?.innerHTML || '';
      const radioRegex = /<input[^>]*name="close-el"[^>]*value="([^"]+)"[^>]*checked/i;
      const radioMatch = radioRegex.exec(closeHTML);
      if (radioMatch) {
        return { value: radioMatch[1], checked: true, type: 'radio' };
      }
      return null;
    }
    return createMockElement('dummy');
  },
  querySelectorAll: (sel) => {
    if (sel === '.screen') {
      return [
        globalThis.document.getElementById('scr-resolve'),
        globalThis.document.getElementById('scr-secret'),
        globalThis.document.getElementById('scr-hub'),
        globalThis.document.getElementById('scr-close'),
        globalThis.document.getElementById('scr-chronicle')
      ];
    }
    if (sel.startsWith('[id^="omen-pick-"]')) {
      const el1 = globalThis.document.getElementById('omen-pick-0');
      const el2 = globalThis.document.getElementById('omen-pick-1');
      const el3 = globalThis.document.getElementById('omen-pick-2');
      return [el1, el2, el3];
    }
    return [];
  },
  activeElement: createMockElement('active'),
  addEventListener: () => {},
};

globalThis.window = {
  scrollTo: () => {},
  addEventListener: () => {},
  history: {
    pushState: () => {},
    replaceState: () => {},
  }
};
globalThis.history = globalThis.window.history;

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
export default {};
