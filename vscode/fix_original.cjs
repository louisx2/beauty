const fs = require('fs');
let lines = fs.readFileSync('Booking_original.tsx', 'utf8').split('\n');

lines[235] = `        setBookingError('Hubo un problema al guardar tu solicitud. Por favor intenta de nuevo o contáctanos por WhatsApp.');`;
lines[243] = '        waMsg = `Hola, quiero reservar el paquete *${selectedPackage.name}* y agendar mi primera sesión:\\n\\n` +';
lines[244] = '          `👤 Nombre: ${form.name}\\n` +';
lines[245] = '          `📞 Teléfono: ${form.phone}\\n` +';
lines[246] = '          `👩‍⚕️ Especialista: ${selectedStaff.name}\\n` +';
lines[247] = '          `📅 Fecha: ${form.date}\\n` +';
lines[248] = '          `🕐 Hora: ${format12h(form.time)}\\n` +';
lines[249] = '          `💰 Precio Total del Paquete: RD$ ${selectedPackage.price.toLocaleString(\'es-DO\')}\\n` +';
lines[250] = '          `💳 Depósito a realizar: RD$ ${depositAmount.toLocaleString(\'es-DO\')}\\n` +';
lines[251] = '          `📝 Notas: ${form.notes.trim() || \'Ninguna\'}\\n\\n` +';
lines[252] = '          `Adjunto el comprobante de depósito para confirmar la compra del paquete y mi primera cita.`;';

lines[254] = '        waMsg = `Hola, acabo de reservar una cita:\\n\\n` +';
lines[255] = '          `👤 Nombre: ${form.name}\\n` +';
lines[256] = '          `📞 Teléfono: ${form.phone}\\n` +';
lines[257] = '          `💆 Servicio: ${selectedService.name}\\n` +';
lines[258] = '          `👩‍⚕️ Con: ${selectedStaff.name}\\n` +';
lines[259] = '          `📅 Fecha: ${form.date}\\n` +';
lines[260] = '          `🕐 Hora: ${format12h(form.time)}\\n` +';
lines[261] = '          `📝 Notas: ${form.notes.trim() || \'Ninguna\'}\\n\\n` +';
lines[262] = '          `Adjunto el comprobante de depósito para confirmar mi cita.`;';

lines[301] = '            <h2>¡Tu cita está pre-reservada!</h2>';
lines[333] = '                        title="Copiar número de cuenta"';
lines[358] = '                    Envía tu comprobante por WhatsApp para que recepción confirme tu reserva.';

lines[405] = '              <span>Agenda según disponibilidad real</span>';
lines[409] = '              <span>Confirmación por WhatsApp</span>';

lines[443] = '                <Phone size={16} /> Teléfono';

lines[527] = '                      {p.name} — RD$ {p.price.toLocaleString(\'es-DO\')}';

lines[585] = '                  <AlertCircle size={16} /> {selectedStaff.name} no trabaja este día.';
lines[592] = '                  día.';

lines[612] = '            <label htmlFor="booking-notes">📝 Notas adicionales</label>';

fs.writeFileSync('src/components/Booking.tsx', lines.join('\n'), 'utf8');
console.log('Fixed Booking.tsx using original');
