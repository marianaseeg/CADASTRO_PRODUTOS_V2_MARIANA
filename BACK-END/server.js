const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// CONEXÃO COM O BANCO SQLITE
// ==========================================

const bancoDeDados = new sqlite3.Database('./produtos.db', (erro) => {
    if (erro) {
        console.error('Erro ao conectar ao banco:', erro.message);
    } else {
        console.log('Banco SQLite conectado com sucesso!');
    }
});

// ==========================================
// CRIAR A TABELA DE PRODUTOS
// ==========================================

bancoDeDados.run(`
    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        quantidade INTEGER NOT NULL
    )
`, (erro) => {
    if (erro) {
        console.error('Erro ao criar tabela:', erro.message);
    } else {
        console.log('Tabela produtos pronta!');
    }
});

// ==========================================
// BUSCAR TODOS OS PRODUTOS
// ==========================================

app.get('/produtos', (req, res) => {

    const sql = `
        SELECT id, nome, preco, quantidade
        FROM produtos
        ORDER BY id
    `;

    bancoDeDados.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.error('Erro ao buscar produtos:', erro.message);

            return res.status(500).json({
                error: 'Erro ao buscar produtos'
            });
        }

        res.json(produtos);
    });
});

// ==========================================
// CADASTRAR PRODUTO
// ==========================================

app.post('/produtos', (req, res) => {

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

    const sql = `
        INSERT INTO produtos (nome, preco, quantidade)
        VALUES (?, ?, ?)
    `;

    bancoDeDados.run(
        sql,
        [nome, precoConvertido, quantidadeConvertida],
        function (erro) {

            if (erro) {
                console.error('Erro ao cadastrar produto:', erro.message);

                return res.status(500).json({
                    error: 'Erro ao cadastrar produto'
                });
            }

            const novoProduto = {
                id: this.lastID,
                nome: nome,
                preco: precoConvertido,
                quantidade: quantidadeConvertida
            };

            res.status(201).json(novoProduto);
        }
    );
});

// ==========================================
// EXCLUIR UM PRODUTO
// ==========================================

app.delete('/produtos/:nome', (req, res) => {

    const nome = decodeURIComponent(req.params.nome);

    const sql = `
        DELETE FROM produtos
        WHERE nome = ?
    `;

    bancoDeDados.run(sql, [nome], function (erro) {

        if (erro) {
            console.error('Erro ao excluir produto:', erro.message);

            return res.status(500).json({
                error: 'Erro ao excluir produto'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: 'Produto não encontrado'
            });
        }

        res.status(200).json({
            mensagem: 'Produto excluído com sucesso'
        });
    });
});

// ==========================================
// EXCLUIR TODOS OS PRODUTOS
// ==========================================

app.delete('/produtos', (req, res) => {

    const sql = `
        DELETE FROM produtos
    `;

    bancoDeDados.run(sql, [], function (erro) {

        if (erro) {
            console.error('Erro ao limpar produtos:', erro.message);

            return res.status(500).json({
                error: 'Erro ao limpar produtos'
            });
        }

        res.status(204).send();
    });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});