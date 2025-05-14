const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function iniciarBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const texto = m.message.conversation?.toLowerCase() || m.message.extendedTextMessage?.text?.toLowerCase();
    const jid = m.key.remoteJid;

    if (!texto) return;

    if (["temario", "temas", "contenido", "qué se va a ver", "que se va a ver", "qué enseñan", "programa", "módulos", "qué se incluye"].some(p => texto.includes(p))) {
      await sock.sendMessage(jid, { text: "📄 Te envío el *temario oficial del curso J2534*. Revisa los contenidos incluidos 👇" });
      await sock.sendMessage(jid, {
        document: fs.readFileSync('./temario-j2534.pdf'),
        fileName: 'temario-j2534.pdf',
        mimetype: 'application/pdf'
      });
      return;
    }

    if (texto.includes("curso j2534")) {
      await sock.sendMessage(jid, { text: "📘 *Curso J2534* - Capacitación técnica virtual. ¿Qué deseas saber?\n\n1️⃣ Precio\n2️⃣ Modalidad\n3️⃣ Instructor\n4️⃣ Temario\n5️⃣ Cómo inscribirte" });
      return;
    }

    if (["inscribirme", "inscripción", "registrarme"].some(p => texto.includes(p))) {
      await sock.sendMessage(jid, { text: "📝 Para inscribirte necesito tu *nombre completo* y *ciudad*. Un asesor te escribirá enseguida." });
      return;
    }

    await sock.sendMessage(jid, { text: "🤖 Hola, soy la asistente virtual de CTAM.\nPuedes escribir *curso J2534* o preguntar directamente por el temario, precio o inscripción." });
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('⚠️ Reintentando conexión...');
        iniciarBot();
      } else {
        console.log('🚪 Sesión cerrada. Ejecuta el bot nuevamente para reconectar.');
      }
    }
  });
}

iniciarBot();
