const express = require("express");
const cors = require("cors");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

let sock;

async function startBot() {
  sock = makeWASocket({ auth: state });
  sock.ev.on("creds.update", saveState);
}

startBot();

app.get("/code", async (req, res) => {
  const number = req.query.number;
  if (!number || number.length < 8) {
    return res.status(400).json({ code: "❌ رقم غير صالح" });
  }

  try {
    const code = await sock.requestPairingCode(number);
    res.json({ code });
  } catch (err) {
    console.error("❌ خطأ في توليد الكود:", err);
    res.status(500).json({ code: "⚠️ فشل توليد الكود. تحقق من الرقم!" });
  }
});

app.listen(port, () => {
  console.log(`🚀 السيرفر يعمل على http://localhost:${port}`);
});
