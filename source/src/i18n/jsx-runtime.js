// JSX runtime that translates text on its way to the screen.
// Every string child of a real HTML element (and its placeholder / aria-label / title / alt)
// goes through tr(), so screens are written in plain English and show Hebrew when it is on.
import { jsx as reactJsx, jsxs as reactJsxs, Fragment } from 'react/jsx-runtime';
import { tr } from '../lib/i18n.js';

const TEXT_PROPS = ['placeholder', 'aria-label', 'title', 'alt'];

function translateChildren(c) {
  if (typeof c === 'string') return tr(c);
  if (Array.isArray(c)) {
    let out = null;
    for (let i = 0; i < c.length; i++) {
      const v = translateChildren(c[i]);
      if (v !== c[i]) {
        out = out || c.slice();
        out[i] = v;
      }
    }
    return out || c;
  }
  return c;
}

export function fix(type, props) {
  if (typeof type !== 'string' || !props) return props; // only real elements: components pass text down
  let next = null;
  for (const k of TEXT_PROPS) {
    const v = props[k];
    if (typeof v === 'string') {
      const t = tr(v);
      if (t !== v) {
        next = next || { ...props };
        next[k] = t;
      }
    }
  }
  if (props.children !== undefined) {
    const c = translateChildren(props.children);
    if (c !== props.children) {
      next = next || { ...props };
      next.children = c;
    }
  }
  return next || props;
}

export function jsx(type, props, key) {
  return reactJsx(type, fix(type, props), key);
}

export function jsxs(type, props, key) {
  return reactJsxs(type, fix(type, props), key);
}

export { Fragment };
