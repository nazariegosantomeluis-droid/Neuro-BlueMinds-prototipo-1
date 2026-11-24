// Huella SHA-256 (H4.5; INV-6; RNF-09): implementación propia, síncrona, y JSON canónico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sha256, huellaDe, canonico } from '../src/huella.js';

test('SHA-256: vectores de FIPS 180-4', () => {
  assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  assert.equal(sha256('a'.repeat(1000)), '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  assert.equal(sha256('ñ'), '024bb90888ca89a15a19e9bdd8c712bfb070465fce1ef25e43c170ea44fc5e5f', 'texto UTF-8');
});

test('la huella no depende del orden de las claves y cambia con cualquier valor', () => {
  assert.equal(canonico({ b: 1, a: [2, { d: 3, c: 4 }] }), '{"a":[2,{"c":4,"d":3}],"b":1}');
  assert.equal(huellaDe({ a: 1, b: 2 }), huellaDe({ b: 2, a: 1 }));
  assert.notEqual(huellaDe({ a: 1, b: 2 }), huellaDe({ a: 1, b: 3 }));
  assert.match(huellaDe({ x: [1, 'dos', null] }), /^[0-9a-f]{64}$/);
});
