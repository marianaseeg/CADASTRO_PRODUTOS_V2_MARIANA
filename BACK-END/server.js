require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static('public'));

// Configuração de conexão com PostgreSQL (Supabase)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Exigido para conexão segura na nuvem
    }
});

// Testar a conexão com o banco
pool.query('SELECT NOW()')
   .then(() => console.log('Conectado com sucesso ao PostgreSQL (Supabase)'))
   .catch(err => console.error('Erro de conexão com o Supabase:', err.stack));

// -------------------------------------------------------------
// ROTAS
// -------------------------------------------------------------

// ROTA GET: Busca todos os produtos
app.get('/produtos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM produtos ORDER BY id ASC');
        res.json(result.rows);
    } catch (erro) {
        console.error('Erro ao buscar produtos:', erro);
        res.status(500).json({ erro: "Erro ao buscar produtos no banco de dados." });
    }
});

// ROTA POST: Insere um novo produto
app.post('/produtos', async (req, res) => {
    const { nome, preco, quantidade } = req.body;

    const p = parseFloat(preco);
    const q = parseInt(quantidade, 10);

    if (!nome || isNaN(p) || isNaN(q) || p <= 0 || q <= 0) {
        return res.status(400).json({ erro: "Dados inválidos enviados para o servidor" });
    }

    try {
        const query = `
           INSERT INTO produtos(nome, preco, quantidade)
           VALUES($1, $2, $3)
           RETURNING *
        `;
        const values = [nome, p, q];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        res.status(500).json({ erro: 'Erro interno ao salvar produto' });
    }
});

// ROTA DELETE (Individual)
app.delete('/produtos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM produtos WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ erro: 'Produto não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ erro: "Erro ao deletar produto." });
    }
});

// ROTA DELETE (Em lote)
app.delete('/produtos', async (req, res) => {
    try {
        await pool.query('DELETE FROM produtos');
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao limpar produtos:', error);
        res.status(500).json({ erro: "Erro ao limpar banco de dados." });
    }
});

// -------------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR
// -------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
});