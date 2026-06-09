const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const supabase = require('../supabase');
 
// Multer — mantém arquivo em memória (buffer) para enviar ao Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por arquivo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas.'));
  },
});
 
// ────────────────────────────────────────────────────────────────
// POST /fotos/:idOcorrencia  — envia fotos de uma ocorrência
// ────────────────────────────────────────────────────────────────
router.post('/:idOcorrencia', upload.array('fotos', 5), async (req, res) => {
  const { idOcorrencia } = req.params;
 
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ erro: 'Nenhuma foto enviada.' });
  }
 
  const resultados = [];
 
  for (const file of req.files) {
    const nomeArquivo = `ocorrencia_${idOcorrencia}_${Date.now()}_${file.originalname}`;
    const caminho     = `fotos/${nomeArquivo}`;
 
    // 1. Faz upload para o bucket "ocorrencias" no Supabase Storage
    const { error: errUpload } = await supabase.storage
      .from('ocorrencias')
      .upload(caminho, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
 
    if (errUpload) {
      console.error('Erro upload:', errUpload);
      continue; // pula esta foto mas continua as demais
    }
 
    // 2. Obtém a URL pública
    const { data: urlData } = supabase.storage
      .from('ocorrencias')
      .getPublicUrl(caminho);
 
    // 3. Salva referência na tabela foto
    const { data: fotoData, error: errFoto } = await supabase
      .from('foto')
      .insert({
        idocorrencia:  parseInt(idOcorrencia),
        url_nuvem:     urlData.publicUrl,
        tamanho_bytes: file.size,
        data_envio:    new Date(),
      })
      .select()
      .single();
 
    if (!errFoto) resultados.push(fotoData);
  }
 
  return res.status(201).json({ fotos: resultados });
});
 
module.exports = router;