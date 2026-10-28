// Dev-server twin of jsx-runtime.js (Vite uses jsxDEV while developing)
import { jsxDEV as reactJsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { fix } from './jsx-runtime.js';

export function jsxDEV(type, props, key, isStatic, source, self) {
  return reactJsxDEV(type, fix(type, props), key, isStatic, source, self);
}

export { Fragment };
