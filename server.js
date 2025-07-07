const express = require('express');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let sock;

async function startSocket() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log('📷 QR CODE:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      console.log('🔌 الاتصال انقطع. إعادة الاتصال؟', shouldReconnect);
      if (shouldReconnect) {
        startSocket();
      }
    } else if (connection === 'open') {
      console.log('✅ تم الاتصال بواتساب!');
    }
  });

  sock.ev.on('creds.update', saveState);
}

startSocket();

app.post('/generate', async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });

  try {
    const id = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(id, { text: `✅ تم ربط واتسابك بالخدمة بنجاح! أهلاً بك.` });
    return res.json({ code: '📩 تم إرسال رسالة الترحيب!' });
  } catch (error) {
    console.error('❌ فشل الإرسال:', error);
    return res.status(500).json({ error: 'فشل إرسال الرسالة. تأكد من الرقم أو اتصال البوت.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 السيرفر شغال على http://localhost:${port}`);
});
