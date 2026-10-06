/*
 * MANTENDO A POO NO FRONTEND (ABSTRAÇÃO)
 */

class Produto {

    #preco;
    #quantidade;

    constructor(nome, preco, quantidade) {

        if (!nome || preco <= 0 || quantidade <= 0) {
            throw new Error("Dados inválidos para o produto");
        }

        this.nome = nome;
        this.#preco = parseFloat(preco);
        this.#quantidade = parseInt(quantidade);
    }

    get preco() {
        return this.#preco;
    }

    get quantidade() {
        return this.#quantidade;
    }

    valorTotal() {
        return this.#preco * this.#quantidade;
    }

    toJSON() {
        return {
            nome: this.nome,
            preco: this.#preco,
            quantidade: this.#quantidade
        };
    }
}


/* URL DA API */

const API_URL = "http://localhost:3000/produtos";


/* ELEMENTOS DAS TELAS */

const telaLogin = document.getElementById("tela-login");
const telaCadastro = document.getElementById("tela-cadastro");
const telaProdutos = document.getElementById("tela-produtos");


/* MOSTRAR CADASTRO */

document.getElementById("mostrar-cadastro").addEventListener("click", function () {

    telaLogin.style.display = "none";
    telaCadastro.style.display = "block";

});


/* MOSTRAR LOGIN */

document.getElementById("mostrar-login").addEventListener("click", function () {

    telaCadastro.style.display = "none";
    telaLogin.style.display = "block";

});


/* CADASTRAR USUÁRIO */

document.getElementById("cadastro-form").addEventListener("submit", async function (e) {

    e.preventDefault();

    const nome = document.getElementById("cadastro-nome").value;
    const email = document.getElementById("cadastro-email").value;
    const senha = document.getElementById("cadastro-senha").value;

    try {

        const resposta = await fetch("http://localhost:3000/auth/registro", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha
            })

        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao cadastrar usuário.");
        }

        alert("Cadastro realizado com sucesso!");

        document.getElementById("cadastro-form").reset();

        telaCadastro.style.display = "none";
        telaLogin.style.display = "block";

    } catch (erro) {

        alert(erro.message);

    }

});


/* LOGIN */

document.getElementById("login-form").addEventListener("submit", async function (e) {

    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-senha").value;

    try {

        const resposta = await fetch("http://localhost:3000/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                senha: senha
            })

        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao realizar login.");
        }

        /* SALVAR TOKEN */

        localStorage.setItem("token", dados.token);

        /* SALVAR USUÁRIO */

        localStorage.setItem("usuario", JSON.stringify(dados.usuario));

        mostrarTelaProdutos();

    } catch (erro) {

        alert(erro.message);

    }

});


/* MOSTRAR TELA DE PRODUTOS */

function mostrarTelaProdutos() {

    telaLogin.style.display = "none";
    telaCadastro.style.display = "none";
    telaProdutos.style.display = "block";

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    document.getElementById("usuario-logado").textContent =
        `Usuário: ${usuario.nome} | Perfil: ${usuario.perfil}`;

    renderizarTabela();

}


/* SAIR */

document.getElementById("sair").addEventListener("click", function () {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    telaProdutos.style.display = "none";
    telaLogin.style.display = "block";

});


/* PEGAR TOKEN */

function pegarToken() {

    return localStorage.getItem("token");

}


/* ADICIONAR PRODUTO */

document.getElementById("produto-form").addEventListener("submit", async function (e) {

    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const preco = document.getElementById("preco").value;
    const quantidade = document.getElementById("quantidade").value;

    try {

        const novoProduto = new Produto(nome, preco, quantidade);

        const resposta = await fetch(API_URL, {

            method: "POST",

            headers: {

                "Content-Type": "application/json",

                "Authorization": `Bearer ${pegarToken()}`

            },

            body: JSON.stringify(novoProduto.toJSON())

        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao salvar o produto.");
        }

        renderizarTabela();

        e.target.reset();

    } catch (erro) {

        alert(erro.message);

    }

});


/* BUSCAR PRODUTOS */

async function renderizarTabela() {

    try {

        const resposta = await fetch(API_URL);

        const dadosBrutosDoServidor = await resposta.json();

        const tabela = document.querySelector("#tabela-produtos tbody");

        tabela.innerHTML = "";

        let totalAcumulado = 0;

        dadosBrutosDoServidor.forEach((dados) => {

            const produto = new Produto(
                dados.nome,
                dados.preco,
                dados.quantidade
            );

            totalAcumulado += produto.valorTotal();

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${produto.nome}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>${produto.quantidade}</td>
                <td>R$ ${produto.valorTotal().toFixed(2)}</td>
                <td>
                    <button
                        class="btn-excluir"
                        onclick="excluirProduto(${dados.id})">
                        Excluir
                    </button>
                </td>
            `;

            tabela.appendChild(row);

        });

        document.getElementById("total-estoque").textContent =
            `Total em estoque: R$ ${totalAcumulado.toFixed(2)}`;

    } catch (erro) {

        console.error("Erro ao buscar dados no servidor:", erro);

    }

}


/* EXCLUIR UM PRODUTO */

async function excluirProduto(id) {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario || usuario.perfil !== "admin") {

        alert("Apenas administradores podem excluir produtos.");

        return;

    }

    if (!confirm("Deseja excluir este produto?")) {
        return;
    }

    try {

        const resposta = await fetch(`${API_URL}/${id}`, {

            method: "DELETE",

            headers: {

                "Authorization": `Bearer ${pegarToken()}`

            }

        });

        const dados = resposta.status === 204
            ? {}
            : await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao excluir produto.");
        }

        renderizarTabela();

    } catch (erro) {

        console.error("Erro ao excluir produto:", erro);

        alert(erro.message);

    }

}


/* LIMPAR TODA A TABELA */

document.getElementById("limpar-tabela").addEventListener("click", async function () {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario || usuario.perfil !== "admin") {

        alert("Apenas administradores podem limpar a tabela.");

        return;

    }

    if (confirm("Deseja mesmo limpar toda a tabela?")) {

        try {

            const resposta = await fetch(API_URL, {

                method: "DELETE",

                headers: {

                    "Authorization": `Bearer ${pegarToken()}`

                }

            });

            if (!resposta.ok) {

                const dados = await resposta.json();

                throw new Error(dados.erro || "Erro ao limpar a tabela.");

            }

            renderizarTabela();

        } catch (erro) {

            console.error("Erro ao limpar dados:", erro);

            alert(erro.message);

        }

    }

});


/* VERIFICAR SE JÁ ESTÁ LOGADO */

const tokenSalvo = localStorage.getItem("token");

if (tokenSalvo) {

    mostrarTelaProdutos();

}