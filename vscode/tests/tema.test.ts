import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerTema, guardarTema, CLAVE_TEMA, TEMA_POR_DEFECTO } from '../src/site/theme/tema.ts';

const memoria = (inicial: Record<string, string> = {}) => {
  const datos = { ...inicial };
  return { getItem: (k: string) => datos[k] ?? null, setItem: (k: string, v: string) => { datos[k] = v; }, datos };
};

test('sin nada guardado abre en marrón', () => {
  assert.equal(TEMA_POR_DEFECTO, 'oscuro');
  assert.equal(leerTema(memoria()), 'oscuro');
});

test('recuerda el beige si la clienta lo eligió', () => {
  assert.equal(leerTema(memoria({ [CLAVE_TEMA]: 'claro' })), 'claro');
});

test('un valor raro guardado vuelve al marrón', () => {
  assert.equal(leerTema(memoria({ [CLAVE_TEMA]: 'azul' })), 'oscuro');
});

test('almacén que falla (modo privado) no rompe: marrón', () => {
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  assert.equal(leerTema(roto), 'oscuro');
  assert.doesNotThrow(() => guardarTema(roto, 'claro'));
});

test('sin almacén disponible también abre en marrón', () => {
  assert.equal(leerTema(null), 'oscuro');
});

test('guarda la elección con su clave', () => {
  const m = memoria();
  guardarTema(m, 'claro');
  assert.equal(m.datos[CLAVE_TEMA], 'claro');
});
