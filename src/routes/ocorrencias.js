const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');
 

// POST /ocorrencias  — cidadão registra uma ocorrência

router.post('/', async (req, res) => {
  const { usuario, local, ocorrencia } = req.body;
 
  // ── Validação básica 
  if (!usuario?.nome || !usuario?.telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }
  if (!local?.cep || !local?.endereco) {
    return res.status(400).json({ erro: 'CEP e endereço são obrigatórios.' });
  }
  if (!ocorrencia?.idcategoria || !ocorrencia?.descricao) {
    return res.status(400).json({ erro: 'Categoria e descrição são obrigatórias.' });
  }
 
  try {
    // ── 1. Upsert usuario (evita duplicatas por telefone)
    let { data: usuarioData, error: errUsuario } = await supabase
      .from('usuario')
      .upsert(
        { nome: usuario.nome, telefone: usuario.telefone },
        { onConflict: 'telefone', ignoreDuplicates: false }
      )
      .select()
      .single();
 
    if (errUsuario) throw errUsuario;
 
    // ── 2. Insere local 
    const { data: localData, error: errLocal } = await supabase
      .from('local')
      .insert({
        cep:      local.cep,
        bairro:   local.bairro  || null,
        endereco: local.endereco,
        zona:     local.zona    || null,
      })
      .select()
      .single();
 
    if (errLocal) throw errLocal;
 
    // ── 3. Insere ocorrenciasd
    const { data: ocorrenciaData, error: errOcorrencia } = await supabase
      .from('ocorrencia')
      .insert({
        idlocal:    localData.id,
        idcategoria: ocorrencia.idcategoria,
        idusuario:  usuarioData.id,
        latitude:   ocorrencia.latitude   || null,
        longitude:  ocorrencia.longitude  || null,
        observacao: ocorrencia.descricao,
        // protocolo e data_inclusao são gerados automaticamente pelo banco
      })
      .select()
      .single();
 
    if (errOcorrencia) throw errOcorrencia;
 
    // ── 4. Registra status inicial
    await supabase
      .from('status')
      .insert({
        idocorrencia:   ocorrenciaData.id,
        status_atual:   null,          // sem status anterior
        status_novo:    'pendente',
        data_alteracao: new Date(),
      });
 
    // ── 5. Resposta
    return res.status(201).json({
      protocolo:   ocorrenciaData.protocolo,
      idocorrencia: ocorrenciaData.id,
    });
 
  } catch (err) {
    console.error('Erro ao registrar ocorrência:', err);
    return res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
});
 
// ────────────────────────────────────────────────────────────────
// GET /ocorrencias  — lista todas (painel da prefeitura)
// ────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('ocorrencia')
    .select(`
      id, protocolo, latitude, longitude, observacao, data_inclusao,
      local   ( cep, bairro, endereco, zona ),
      categoria ( tipo, classificacao ),
      usuario ( nome, telefone ),
      foto    ( url_nuvem, tamanho_bytes, data_envio ),
      status  ( status_atual, status_novo, data_alteracao )
    `)
    .order('data_inclusao', { ascending: false });
 
  if (error) return res.status(500).json({ erro: error.message });
  return res.json(data);
});
 
// ────────────────────────────────────────────────────────────────
// GET /ocorrencias/:protocolo — busca por protocolo (cidadão)
// ────────────────────────────────────────────────────────────────
router.get('/:protocolo', async (req, res) => {
  const { protocolo } = req.params;
 
  const { data, error } = await supabase
    .from('ocorrencia')
    .select(`
      id, protocolo, latitude, longitude, observacao, data_inclusao,
      local    ( cep, bairro, endereco, zona ),
      categoria ( tipo, classificacao ),
      status   ( status_atual, status_novo, data_alteracao )
    `)
    .eq('protocolo', protocolo)
    .single();
 
  if (error) return res.status(404).json({ erro: 'Protocolo não encontrado.' });
  return res.json(data);
});


router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status_novo, observacao } = req.body;
 
  const statusValidos = ['pendente', 'em_andamento', 'resolvido', 'cancelado'];
  if (!statusValidos.includes(status_novo)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${statusValidos.join(', ')}` });
  }
 
  try {
    // Busca status atual
    const { data: atual } = await supabase
      .from('status')
      .select('status_novo')
      .eq('idocorrencia', id)
      .order('data_alteracao', { ascending: false })
      .limit(1)
      .single();
 
    // Registra histórico
    await supabase.from('status').insert({
      idocorrencia:   id,
      status_atual:   atual?.status_novo || null,
      status_novo,
      data_alteracao: new Date(),
    });
 
    // Atualiza observação se enviada
    if (observacao) {
      await supabase
        .from('ocorrencia')
        .update({ observacao })
        .eq('id', id);
    }
 
    return res.json({ ok: true, status_novo });
 
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
});
 
module.exports = router;