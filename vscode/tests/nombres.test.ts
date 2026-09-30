import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capitalizarNombre } from '../src/lib/nombres.ts';

test('capitalizarNombre: mayúscula al empezar cada palabra, con tildes en el medio', () => {
  assert.equal(capitalizarNombre('carmen rodríguez'), 'Carmen Rodríguez');
  assert.equal(capitalizarNombre('Carmen Rodríguez'), 'Carmen Rodríguez');
});

test('capitalizarNombre: empieza con letra acentuada o ñ', () => {
  assert.equal(capitalizarNombre('ángela díaz'), 'Ángela Díaz');
  assert.equal(capitalizarNombre('maría-josé ñúñez'), 'María-José Ñúñez');
});

test('capitalizarNombre: títulos con punto', () => {
  assert.equal(capitalizarNombre('dra. nadieska soto'), 'Dra. Nadieska Soto');
});

test('capitalizarNombre: al escribir letra por letra no aparece una mayúscula en medio', () => {
  assert.equal(capitalizarNombre('Carmen Rodrí' + 'g'), 'Carmen Rodríg');
});

test('capitalizarNombre: vacío queda vacío', () => {
  assert.equal(capitalizarNombre(''), '');
});
