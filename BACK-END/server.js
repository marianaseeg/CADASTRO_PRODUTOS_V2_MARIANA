const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'chave-secreta-do-projeto';

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================

function autenticarToken(req, res, next) {

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            erro: 'Token não informado.'
        });
    }

    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({
            erro: 'Formato do token inválido.'
        });
    }

    const token = partes[1];

    jwt.verify(token, JWT_SECRET, (err, usuario) => {

        if (err) {
            return res.status(403).json({
                erro: 'Token inválido ou expirado.'
            });
        }

        req.usuario = usuario;

        next();
    });
}

// ==========================================
// MIDDLEWARE DE ADMIN
// ==========================================

function exigirAdmin(req, res, next) {

    if (!req.usuario || req.usuario.perfil !== 'admin') {
        return res.status(403).json({
            erro: 'Acesso permitido somente para administradores.'
        });
    }

    next();
}




app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./produtos.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Banco SQLite conectado com sucesso!');
    }
});


// CRIAR TABELA DE PRODUTOS
db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        quantidade INTEGER NOT NULL
    )
`, (err) => {
    if (err) {
        console.error('Erro ao criar tabela produtos:', err.message);
    } else {
        console.log('Tabela produtos pronta!');
    }
});


// CRIAR TABELA DE USUÁRIOS
db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'cliente'
    )
`, (err) => {
    if (err) {
        console.error('Erro ao criar tabela usuarios:', err.message);
    } else {
        console.log('Tabela usuarios pronta!');
    }
});


// ==========================================
// CADASTRO DE USUÁRIO
// ==========================================

app.post('/auth/registro', async (req, res) => {

    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: 'Nome, email e senha são obrigatórios.'
        });
    }

    try {

        // Verificar se o email já existe
        db.get(
            'SELECT id FROM usuarios WHERE email = ?',
            [email],
            async (err, usuarioExistente) => {

                if (err) {
                    console.error('Erro ao verificar usuário:', err);
                    return res.status(500).json({
                        erro: 'Erro ao verificar usuário.'
                    });
                }

                if (usuarioExistente) {
                    return res.status(400).json({
                        erro: 'Este email já está cadastrado.'
                    });
                }

                // Criar hash da senha
                const senhaHash = await bcrypt.hash(senha, 10);

                // Perfil padrão é cliente
                const perfilFinal = perfil === 'admin' ? 'admin' : 'cliente';

                // Salvar usuário
                db.run(
                    `INSERT INTO usuarios (nome, email, senha, perfil)
                     VALUES (?, ?, ?, ?)`,
                    [nome, email, senhaHash, perfilFinal],
                    function (err) {

                        if (err) {
                            console.error('Erro ao cadastrar usuário:', err);
                            return res.status(500).json({
                                erro: 'Erro ao cadastrar usuário.'
                            });
                        }

                        res.status(201).json({
                            mensagem: 'Usuário cadastrado com sucesso!',
                            usuario: {
                                id: this.lastID,
                                nome: nome,
                                email: email,
                                perfil: perfilFinal
                            }
                        });

                    }
                );

            }
        );

    } catch (error) {

        console.error('Erro no cadastro:', error);

        res.status(500).json({
            erro: 'Erro interno no cadastro.'
        });

    }
});

         
// ==========================================
// LOGIN DE USUÁRIO
// ==========================================

app.post('/auth/login', (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            erro: 'Email e senha são obrigatórios.'
        });
    }

    db.get(
        'SELECT * FROM usuarios WHERE email = ?',
        [email],
        async (err, usuario) => {

            if (err) {
                console.error('Erro ao buscar usuário:', err);

                return res.status(500).json({
                    erro: 'Erro ao realizar login.'
                });
            }

            if (!usuario) {
                return res.status(401).json({
                    erro: 'Email ou senha incorretos.'
                });
            }

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    erro: 'Email ou senha incorretos.'
                });
            }

            const token = jwt.sign(
                {
                    id: usuario.id,
                    perfil: usuario.perfil
                },
                JWT_SECRET,
                {
                    expiresIn: '2h'
                }
            );

            res.json({
                mensagem: 'Login realizado com sucesso!',
                token: token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    perfil: usuario.perfil
                }
            });
        }
    );
});


// ==========================================
// GET PRODUTOS
// ==========================================

app.get('/produtos', (req, res) => {

    db.all(
        'SELECT * FROM produtos ORDER BY id ASC',
        [],
        (err, rows) => {

            if (err) {
                console.error('Erro ao buscar produtos:', err);

                return res.status(500).json({
                    erro: 'Erro ao buscar produtos no banco de dados.'
                });
            }

            res.json(rows);
        }
    );
});


// ==========================================
// POST PRODUTOS
// ==========================================

app.post('/produtos', autenticarToken, (req, res) =>  {

    const { nome, preco, quantidade } = req.body;

    const p = parseFloat(preco);
    const q = parseInt(quantidade, 10);

    if (!nome || isNaN(p) || isNaN(q) || p <= 0 || q <= 0) {

        return res.status(400).json({
            erro: 'Dados inválidos enviados para o servidor'
        });

    }

    db.run(
        `INSERT INTO produtos (nome, preco, quantidade)
         VALUES (?, ?, ?)`,
        [nome, p, q],
        function (err) {

            if (err) {
                console.error('Erro ao salvar produto:', err);

                return res.status(500).json({
                    erro: 'Erro interno ao salvar produto'
                });
            }

            res.status(201).json({
                id: this.lastID,
                nome,
                preco: p,
                quantidade: q
            });

        }
    );
});

// ==========================================
// PUT PRODUTO
// ==========================================

app.put('/produtos/:id', autenticarToken, (req, res) => {

    const { id } = req.params;
    const { nome, preco, quantidade } = req.body;

    const p = parseFloat(preco);
    const q = parseInt(quantidade, 10);

    if (!nome || isNaN(p) || isNaN(q) || p <= 0 || q <= 0) {
        return res.status(400).json({
            erro: 'Dados inválidos enviados para o servidor'
        });
    }

    db.run(
        `UPDATE produtos
         SET nome = ?, preco = ?, quantidade = ?
         WHERE id = ?`,
        [nome, p, q, id],
        function (err) {

            if (err) {
                console.error('Erro ao atualizar produto:', err);

                return res.status(500).json({
                    erro: 'Erro ao atualizar produto.'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    erro: 'Produto não encontrado.'
                });
            }

            res.json({
                id: Number(id),
                nome,
                preco: p,
                quantidade: q
            });
        }
    );
});



// ==========================================
// DELETE PRODUTO
// ==========================================

app.delete('/produtos/:id', autenticarToken, exigirAdmin, (req, res) => {

    const { id } = req.params;

    db.run(
        'DELETE FROM produtos WHERE id = ?',
        [id],
        function (err) {

            if (err) {
                console.error('Erro ao deletar produto:', err);

                return res.status(500).json({
                    erro: 'Erro ao deletar produto.'
                });
            }

            if (this.changes === 0) {

                return res.status(404).json({
                    erro: 'Produto não encontrado'
                });

            }

            res.status(204).send();
        }
    );
});


// ==========================================
// DELETE TODOS OS PRODUTOS
// ==========================================

app.delete('/produtos', autenticarToken, exigirAdmin, (req, res) => {

    db.run(
        'DELETE FROM produtos',
        [],
        (err) => {

            if (err) {
                console.error('Erro ao limpar produtos:', err);

                return res.status(500).json({
                    erro: 'Erro ao limpar banco de dados.'
                });
            }

            res.status(204).send();
        }
    );
});


// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
});