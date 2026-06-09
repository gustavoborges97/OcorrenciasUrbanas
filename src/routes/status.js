const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');
 
// GET /status/:idOcorrencia — retorna todo o histórico de status
router.get('/:idOcorrencia', async (req, res) => {
  const { idOcorrencia } = req.params;
 
  const { data, error } = await supabase
    .from('status')
    .select('*')
    .eq('idocorrencia', idOcorrencia)
    .order('data_alteracao', { ascending: true });
 
  if (error) return res.status(500).json({ erro: error.message });
  return res.json(data);
});
 
module.exports = router;