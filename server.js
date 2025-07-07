const express = require('express');
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { useSingleFileAuthState } = require('@whiskeysockets/baileys/lib/utils/auth');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let sock;

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      console.log('✅ واتساب جاهز!');
    }
  });

  sock.ev.on('creds.update', saveState);
}

startSock();

app.post('/generate', async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.status(400).json({ error: 'رقم الهاتف مطلوب' });

  try {
    const id = phone.replace(/\D/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(id, { text: '✅ تم ربط الرقم بنجاح. مرحبًا بك في بوت ترزان!' });
    res.json({ code: '📩 تم إرسال رسالة ترحيب لرقمك' });
  } catch (err) {
    console.error('❌ خطأ في الإرسال:', err);
    res.status(500).json({ error: 'فشل إرسال الرسالة. تحقق من الرقم أو الاتصال' });
  }
});

app.listen(port, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${port}`);
});
