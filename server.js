const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Carpmatik Sunucusu Calisiyor!");
});

const wss = new WebSocket.Server({ server });

let bekleyenOyuncu = null;
let odalar = {};

wss.on('connection', (ws) => {
  ws.odaId = null;
  ws.rol = 0; // 1: Kırmızı, 2: Yeşil

  if (bekleyenOyuncu === null || bekleyenOyuncu.readyState !== WebSocket.OPEN) {
    bekleyenOyuncu = ws;
    ws.rol = 1;
    ws.send(JSON.stringify({ tip: "bekle", mesaj: "Rakip bekleniyor..." }));
  } else {
    const rakip = bekleyenOyuncu;
    bekleyenOyuncu = null;

    ws.rol = 2;
    const odaId = "oda_" + Math.random().toString(36).substring(7);
    
    ws.odaId = odaId;
    rakip.odaId = odaId;

    odalar[odaId] = { p1: rakip, p2: ws };

    let sayilar = [1,2,3,4,5,6,7,8,9,10,12,14,15,16,18,20,21,24,25,27,28,30,32,35,36,40,42,45,48,49,54,56,63,64,72,81];
    sayilar.sort(() => Math.random() - 0.5);

    rakip.send(JSON.stringify({ tip: "basla", rol: 1, sayilar: sayilar }));
    ws.send(JSON.stringify({ tip: "basla", rol: 2, sayilar: sayilar }));
  }

  ws.on('message', (veri) => {
    try {
      const paket = JSON.parse(veri);
      const oda = odalar[ws.odaId];
      if (!oda) return;

      const digerOyuncu = (ws === oda.p1) ? oda.p2 : oda.p1;
      if (digerOyuncu && digerOyuncu.readyState === WebSocket.OPEN) {
        digerOyuncu.send(JSON.stringify(paket));
      }
    } catch (e) {
      console.error("Hata:", e);
    }
  });

  ws.on('close', () => {
    if (bekleyenOyuncu === ws) bekleyenOyuncu = null;
    const oda = odalar[ws.odaId];
    if (oda) {
      const digerOyuncu = (ws === oda.p1) ? oda.p2 : oda.p1;
      if (digerOyuncu && digerOyuncu.readyState === WebSocket.OPEN) {
        digerOyuncu.send(JSON.stringify({ tip: "rakip_ayrildi" }));
      }
      delete odalar[ws.odaId];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu aktif: port ${PORT}`);
});
