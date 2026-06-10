const express = require('express');
const path    = require('path');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));

app.use('/ocorrencias', require('./routes/ocorrencias'));
app.use('/fotos',       require('./routes/fotos'));
app.use('/status',      require('./routes/status'));

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));

