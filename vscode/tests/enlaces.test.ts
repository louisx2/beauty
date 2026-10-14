import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoWhatsApp, enlaceWhatsApp, modoWhatsApp, numeroWhatsApp, sinEmojis } from '../src/lib/enlaces.ts';

test('el mensaje de WhatsApp sale sin emojis (en la computadora salían como "�"), con tildes y saltos', () => {
  assert.equal(sinEmojis('Hola Yokasta 👋 Te recordamos tu cita 📅 de mañana 🌸'), 'Hola Yokasta Te recordamos tu cita de mañana');
  assert.equal(sinEmojis('¡Feliz cumpleaños! 🎉🎂\n\nAnadsll ❤️'), '¡Feliz cumpleaños!\n\nAnadsll');
  assert.equal(sinEmojis('👩‍⚕️ Dra. Melissa · 10:00 AM'), 'Dra. Melissa · 10:00 AM');
  assert.equal(sinEmojis('Sin nada raro: ñ, á, é, ¿?'), 'Sin nada raro: ñ, á, é, ¿?');
});

test('el enlace: número de RD con el 1, la web en pestaña nueva, la app en la misma', () => {
  assert.equal(numeroWhatsApp('829-555-1074'), '18295551074');
  assert.equal(numeroWhatsApp('+1 (829) 555-1074'), '18295551074');
  const web = enlaceWhatsApp('829-555-1074', 'Hola 👋 María, ¿vienes mañana?', 'web');
  assert.equal(web, `https://api.whatsapp.com/send?phone=18295551074&text=${encodeURIComponent('Hola María, ¿vienes mañana?')}`);
  assert.ok(!web.includes('wa.me'));
  assert.ok(enlaceWhatsApp('8295551074', 'Hola', 'app').startsWith('whatsapp://send?phone=18295551074&text=Hola'));
  assert.equal(destinoWhatsApp('web'), '_blank');
  assert.equal(destinoWhatsApp('app'), undefined);
  // sin navegador (o si no deja guardar), lo de siempre
  assert.equal(modoWhatsApp(), 'web');
});
