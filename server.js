const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

// إعداد التوثيق في ملف منفصل
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 امسح رمز QR التالي لربط واتساب:\n');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('📴 تم قطع الاتصال، إعادة المحاولة:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ تم الاتصال بواتساب بنجاح!');
    }
  });

  sock.ev.on('creds.update', saveState);

  // مثال: الرد على رسالة بسيطة
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (text === 'مرحبا') {
      await sock.sendMessage(sender, { text: 'أهلاً بك! 👋' });
    }
  });
}

startBot();
