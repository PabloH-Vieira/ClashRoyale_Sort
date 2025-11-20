let todosDecks = [];
let isOrdenando = false; // Trava para não clicar 2x

// Elementos DOM
const container = document.getElementById('grid-resultados');
const modal = document.getElementById('modal-detalhes');
const modalConteudoGrid = document.getElementById('modal-cartas-grid');
const statusAlgo = document.getElementById('status-algo');

const inputs = {
    ataque: document.getElementById('slider-ataque'),
    defesa: document.getElementById('slider-defesa'),
    elixir: document.getElementById('slider-elixir')
};
const displays = {
    ataque: document.getElementById('val-ataque'),
    defesa: document.getElementById('val-defesa'),
    elixir: document.getElementById('val-elixir')
};

// 1. Carregamento Inicial
async function carregarDados() {
    try {
        const res = await fetch('./decks.json');
        todosDecks = await res.json();
        document.getElementById('total-decks').innerText = todosDecks.length;
        atualizarScores(); // Calcula score inicial
        ordenarRapido();   // Já começa ordenado
    } catch (erro) {
        console.error("Erro ao carregar:", erro);
        container.innerHTML = "<p style='color:red'>Erro ao carregar decks.json. Use o Live Server!</p>";
    }
}

// 2. Sistema de Pontuação
function calcularScore(deck, pesos) {
    let ptsAtaque = deck.stats.ataque * pesos.ataque;
    let ptsDefesa = deck.stats.defesa * pesos.defesa;
    let ptsElixir = (10 - deck.stats.elixir_medio) * pesos.elixir * 50;
    return ptsAtaque + ptsDefesa + ptsElixir;
}

function atualizarScores() {
    const pesos = {
        ataque: parseInt(inputs.ataque.value),
        defesa: parseInt(inputs.defesa.value),
        elixir: parseInt(inputs.elixir.value)
    };

    // Atualiza display numérico
    displays.ataque.innerText = pesos.ataque;
    displays.defesa.innerText = pesos.defesa;
    displays.elixir.innerText = pesos.elixir;

    // Recalcula score de todos
    todosDecks.forEach(d => d._score = calcularScore(d, pesos));
}

// 3. Ordenação Rápida (Quick Sort nativo do JS) - O(n log n)
function ordenarRapido() {
    if (isOrdenando) return;
    atualizarScores();

    const start = performance.now();
    todosDecks.sort((a, b) => b._score - a._score);
    const end = performance.now();

    renderizarCards(todosDecks.slice(0, 50)); // Renderiza top 50

    document.getElementById('top-score').innerText = Math.floor(todosDecks[0]._score);
    statusAlgo.innerText = `Quick Sort: ${(end - start).toFixed(2)}ms (Instantâneo)`;
    statusAlgo.style.color = "#2ecc71";
}

// 4. Ordenação Lenta (Bubble Sort Visual) - O(n^2)
async function ordenarLento() {
    if (isOrdenando) return;
    isOrdenando = true;
    atualizarScores();

    // Para a demo visual, pegamos apenas uma amostra pequena (ex: 20 decks)
    // Senão o usuário ficaria horas esperando 5000 itens.
    let amostra = todosDecks.slice(0, 20);
    renderizarCards(amostra);

    statusAlgo.innerText = "Rodando Bubble Sort... Olhe a tela!";
    statusAlgo.style.color = "#e74c3c";

    let len = amostra.length;
    let trocou;

    // Algoritmo Bubble Sort
    for (let i = 0; i < len; i++) {
        trocou = false;
        for (let j = 0; j < len - i - 1; j++) {

            // Visual: Destaca os dois que estão sendo comparados
            destacarCards(j, j + 1);

            // Delay artificial para o olho humano acompanhar (100ms)
            await new Promise(r => setTimeout(r, 100));

            // Compara Score (Menor vai pro final, pois queremos decrescente)
            if (amostra[j]._score < amostra[j + 1]._score) {
                // Troca no Array
                let temp = amostra[j];
                amostra[j] = amostra[j + 1];
                amostra[j + 1] = temp;
                trocou = true;

                // Atualiza visualmente a troca
                renderizarCards(amostra);
                destacarCards(j, j+1); // Mantém destaque após renderizar
            }

            removerDestaque();
        }
        if (!trocou) break;
    }

    statusAlgo.innerText = "Bubble Sort Finalizado (Ufa!)";
    isOrdenando = false;
}

// Auxiliar para animação visual
function destacarCards(idx1, idx2) {
    const cards = document.querySelectorAll('.card');
    if (cards[idx1]) cards[idx1].classList.add('trocando');
    if (cards[idx2]) cards[idx2].classList.add('trocando');
}

function removerDestaque() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(c => c.classList.remove('trocando'));
}

// 5. Renderização e Eventos de Clique (MODAL)
function renderizarCards(lista) {
    container.innerHTML = "";

    lista.forEach(deck => {
        const div = document.createElement('div');
        div.className = 'card';

        // Adiciona evento de clique para abrir detalhes
        div.onclick = () => abrirModal(deck);

        div.innerHTML = `
            <h3>${deck.nome_deck}</h3>
            <img src="${deck.imagem_destaque}" alt="Deck Img" onerror="this.src='https://via.placeholder.com/150?text=Deck'">
            <div class="stats">
                <span>⚔️ ${deck.stats.ataque}</span>
                <span>🛡️ ${deck.stats.defesa}</span>
            </div>
            <div class="score-tag">Score: ${Math.floor(deck._score)}</div>
        `;
        container.appendChild(div);
    });
}

// No arquivo script.js

function abrirModal(deck) {
    const modal = document.getElementById('modal-detalhes');
    const titulo = document.getElementById('modal-titulo');
    const grid = document.getElementById('modal-cartas-grid');

    titulo.innerText = deck.nome_deck;
    grid.innerHTML = ""; // Limpa cartas antigas

    deck.cartas.forEach(carta => {
        // VERIFICAÇÃO DE SEGURANÇA (Resolve o "Undefined")
        // Se o JSON for antigo (carta é string), usa texto.
        // Se for novo (carta é objeto), usa imagem.

        if (typeof carta === 'string') {
            // MODO TEXTO (Fallback para JSON antigo)
            const div = document.createElement('div');
            div.className = 'carta-item';
            div.innerText = carta;
            grid.appendChild(div);
        } else {
            // MODO IMAGEM (JSON Novo)
            const img = document.createElement('img');
            img.src = carta.imagem || 'https://via.placeholder.com/80?text=?'; // Evita erro se URL falhar
            img.alt = carta.nome;
            img.className = 'carta-modal-img';
            img.title = carta.nome;
            grid.appendChild(img);
        }
    });

    modal.classList.remove('hidden');
}

// 7. Configuração dos Botões e Eventos (CORRIGIDA)

// Função para fechar o modal
function fecharModal() {
    const modal = document.getElementById('modal-detalhes');
    modal.classList.add('hidden');
}

// Garante que o botão de fechar funciona
const btnFechar = document.querySelector('.close-btn');
if (btnFechar) {
    btnFechar.addEventListener('click', fecharModal);
}

// Fecha clicando fora da janela (fundo escuro)
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal-detalhes');
    if (event.target === modal) {
        fecharModal();
    }
});

// Listeners dos Sliders
inputs.ataque.addEventListener('input', () => { if(!isOrdenando) ordenarRapido() });
inputs.defesa.addEventListener('input', () => { if(!isOrdenando) ordenarRapido() });
inputs.elixir.addEventListener('input', () => { if(!isOrdenando) ordenarRapido() });

// Listeners dos Botões de Ordenação
document.getElementById('btn-quick').addEventListener('click', ordenarRapido);
document.getElementById('btn-bubble').addEventListener('click', ordenarLento);

// Iniciar
carregarDados();