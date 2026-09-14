require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');

const app = express();

app.use(cors());
app.use(express.json());

const bancoDeDados = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

// ==========================================
// CRIAR A TABELA DE PRODUTOS
// ==========================================
async function criarTabela() {
    try {
        await bancoDeDados.execute(`
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                preco REAL NOT NULL,
                quantidade INTEGER NOT NULL
            )
        `);

        console.log('Tabela produtos pronta!');
    } catch (erro) {
        console.error('Erro ao criar tabela:', erro.message);
    }
}

// ==========================================
// BUSCAR TODOS OS PRODUTOS
// ==========================================
app.get('/produtos', async (req, res) => {
    try {
        const resultado = await bancoDeDados.execute(`
            SELECT id, nome, preco, quantidade
            FROM produtos
            ORDER BY id
        `);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar produtos:', erro.message);

        res.status(500).json({
            error: 'Erro ao buscar produtos'
        });
    }
});

// ==========================================
// CADASTRAR PRODUTO
// ==========================================
app.post('/produtos', async (req, res) => {
    const { nome, preco, quantidade } = req.body;

    const precoConvertido = parseFloat(preco);
    const quantidadeConvertida = parseInt(quantidade);

    if (
        !nome ||
        isNaN(precoConvertido) ||
        isNaN(quantidadeConvertida)
    ) {
        return res.status(400).json({
            error: 'Dados inválidos para o produto'
        });
    }

    try {
        const resultado = await bancoDeDados.execute({
            sql: `
                INSERT INTO produtos (nome, preco, quantidade)
                VALUES (?, ?, ?)
            `,
            args: [nome, precoConvertido, quantidadeConvertida]
        });

        const novoProduto = {
            id: Number(resultado.lastInsertRowid),
            nome: nome,
            preco: precoConvertido,
            quantidade: quantidadeConvertida
        };

        res.status(201).json(novoProduto);

    } catch (erro) {
        console.error('Erro ao cadastrar produto:', erro.message);

        res.status(500).json({
            error: 'Erro ao cadastrar produto'
        });
    }
});

// ==========================================
// EXCLUIR UM PRODUTO
// ==========================================
app.delete('/produtos/:nome', async (req, res) => {
    const nome = decodeURIComponent(req.params.nome);

    try {
        const resultado = await bancoDeDados.execute({
            sql: `
                DELETE FROM produtos
                WHERE nome = ?
            `,
            args: [nome]
        });

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({
                error: 'Produto não encontrado'
            });
        }

        res.status(200).json({
            mensagem: 'Produto excluído com sucesso'
        });

    } catch (erro) {
        console.error('Erro ao excluir produto:', erro.message);

        res.status(500).json({
            error: 'Erro ao excluir produto'
        });
    }
});

// ==========================================
// EXCLUIR TODOS OS PRODUTOS
// ==========================================
app.delete('/produtos', async (req, res) => {
    try {
        await bancoDeDados.execute(`
            DELETE FROM produtos
        `);

        res.status(204).send();

    } catch (erro) {
        console.error('Erro ao limpar produtos:', erro.message);

        res.status(500).json({
            error: 'Erro ao limpar produtos'
        });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

criarTabela().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor backend rodando na porta ${PORT}`);
    });
});