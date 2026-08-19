import { loadState, saveState } from './storage.js';

let state = loadState();
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(mutator) {
  mutator(state);
  saveState(state);
  listeners.forEach((fn) => fn(state));
}

export function replaceState(nuevoEstado) {
  state = nuevoEstado;
  saveState(state);
  listeners.forEach((fn) => fn(state));
}
