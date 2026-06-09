require('dotenv').config();
const express = require('express');
const cors    = require('cors');
 
const ocorrenciasRouter = require('./routes/ocorrencias');
const fotosRouter       = require('./routes/fotos');
const statusRouter      = require('./routes/status.js');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
app.use(cors());                         
app.use(express.json());                 
 
// ── Rotas ────────────────────────────────────────────────────────
app.use('/ocorrencias', ocorrenciasRouter);
app.use('/fotos',       fotosRouter);
app.use('/status',      statusRouter);
 
app.get('/', (_req, res) => res.json({ ok: true, msg: 'API Ocorrências Urbanas SP' }));
 
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});
 
app.listen(PORT, () => console.log(`✅ API rodando em http://localhost:${PORT}`));