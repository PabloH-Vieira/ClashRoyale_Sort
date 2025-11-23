let allDecks = [];
let isSorting = false;

// DOM Elements
const container = document.getElementById('grid-results');
const modal = document.getElementById('modal-details');
const modalContentGrid = document.getElementById('modal-cards-grid');
const somethingStatus = document.getElementById('status-something');

const inputs = {
    attack: document.getElementById('attack_slider'),
    defense: document.getElementById('defense_slider'),
    elixir: document.getElementById('elixir_slider')
};
const displays = {
    attack: document.getElementById('attack_value'),
    defense: document.getElementById('defense_value'),
    elixir: document.getElementById('elixir_value')
};

// 1. Initial Load
async function loadData() {
    try {
        const res = await fetch('./decks.json');
        allDecks = await res.json();

        console.log("Decks carregados:", allDecks.length);

        const totalEl = document.getElementById('total-decks');
        if(totalEl) totalEl.innerText = allDecks.length;

        updateScores();
        quickSortDecks();
    } catch (error) {
        console.error("Error loading:", error);
        container.innerHTML = "<p style='color:red; text-align:center;'>Erro ao carregar decks.json.</p>";
    }
}

// 2. Scoring System
function calculateScore(deck, weights) {
    let attackPoints = deck.stats.attack * weights.attack;
    let defensePoints = deck.stats.defense * weights.defense;
    let elixirPoints = (10 - deck.stats.elixir_cost) * weights.elixir * 50;

    return attackPoints + defensePoints + elixirPoints;
}


function updateScores() {
    const weights = {
        attack: parseInt(inputs.attack.value),
        defense: parseInt(inputs.defense.value),
        elixir: parseInt(inputs.elixir.value)
    };

    displays.attack.innerText = weights.attack;
    displays.defense.innerText = weights.defense;
    displays.elixir.innerText = weights.elixir;

    //CALCULATE BRUTE SCORE AND FIND EXTREMES
    let maxRaw = -Infinity;
    let minRaw = Infinity;

    allDecks.forEach(d => {
        let rawScore = calculateScore(d, weights);
        d._rawScore = rawScore;
        if (rawScore > maxRaw) maxRaw = rawScore;
        if (rawScore < minRaw) minRaw = rawScore;
    });

    //NORMALIZING TO A SCALE OF 0 TO 100
    allDecks.forEach(d => {
        if (maxRaw === minRaw) {
            d._score = 100;
        } else {
            let normalized = ((d._rawScore - minRaw) / (maxRaw - minRaw)) * 100;
            d._score = normalized;
        }
    });
}

// 3. Quick Sort - O(n log n)
function quickSortDecks() {
    if (isSorting) return;
    updateScores();

    const start = performance.now();
    allDecks.sort((a, b) => b._score - a._score);
    const end = performance.now();

    renderCards(allDecks.slice(0, 50));

    const topScoreEl = document.getElementById('top-score');
    if(topScoreEl) topScoreEl.innerText = Math.floor(allDecks[0]._score);

    if(somethingStatus) {
        somethingStatus.innerText = `Quick Sort: ${(end - start).toFixed(2)}ms (Instantâneo)`;
        somethingStatus.style.color = "#2ecc71";
    }
}

// 4. Slow Sort - O(n^2) com Cronômetro
async function slowSortDecks() {
    if (isSorting) return;
    isSorting = true;
    updateScores();

    let sample = allDecks.slice(0, 20);
    renderCards(sample);

    const statusText = document.getElementById('status-something');
    if(statusText) {
        statusText.style.color = "#e74c3c";
        statusText.innerText = "Iniciando Bubble Sort...";
    }

    let len = sample.length;
    let swapped;
    let startTime = Date.now();

    // Loop Principal
    for (let i = 0; i < len; i++) {
        swapped = false;
        for (let j = 0; j < len - i - 1; j++) {
            //Counter
            if(statusText) {
                let tempoDecorrido = ((Date.now() - startTime) / 1000).toFixed(1);
                statusText.innerText = `⏳ Bubble Sort rodando: ${tempoDecorrido}s`;
            }

            highlightCards(j, j + 1);

            await new Promise(r => setTimeout(r, 100));

            if (sample[j]._score < sample[j + 1]._score) {
                let temp = sample[j];
                sample[j] = sample[j + 1];
                sample[j + 1] = temp;
                swapped = true;
                renderCards(sample);
                highlightCards(j, j+1);
            }
            removeHighlight();
        }
        if (!swapped) break;
    }

    // FINAL TIME
    let totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if(statusText) {
        statusText.innerText = `✅ Bubble Sort Finalizado: ${totalTime}s`;
        statusText.style.color = "#2c3e50";
    }

    isSorting = false;
}

function highlightCards(idx1, idx2) {
    const cards = document.querySelectorAll('.card');
    if (cards[idx1]) cards[idx1].classList.add('trocando');
    if (cards[idx2]) cards[idx2].classList.add('trocando');
}

function removeHighlight() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(c => c.classList.remove('trocando'));
}

function renderCards(list) {
    container.innerHTML = "";

    const wAtk = parseInt(inputs.attack.value);
    const wDef = parseInt(inputs.defense.value);
    const wElx = parseInt(inputs.elixir.value);

    let criterio = 'ataque'; // Padrão
    if (wDef > wAtk && wDef > wElx) criterio = 'defesa';
    else if (wElx > wAtk && wElx > wDef) criterio = 'elixir';

    list.forEach(deck => {
        //FIND THE CARD WHICH PROPERLY REPRESENTS THE ATRIBUTE
        let cartaDestaque = null;

        if (deck.cards && deck.cards[0] && deck.cards[0].stats) {

            // SORT THE DECKS BASED ON DEFINED CRITERIA
            const cartasOrdenadas = [...deck.cards].sort((a, b) => {
                if (criterio === 'ataque') return b.stats.attack - a.stats.attack;
                if (criterio === 'defesa') return b.stats.defense - a.stats.defense;
                if (criterio === 'elixir') return a.stats.cost - b.stats.cost;
                return 0;
            });

            cartaDestaque = cartasOrdenadas[0];
        }

        const imgCapa = cartaDestaque ? cartaDestaque.image : (deck.cards[0].image || 'https://via.placeholder.com/150');

        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => openModal(deck);

        div.innerHTML = `
            <h3>${deck.deck_name}</h3>
            
            <div style="position: relative; text-align: center">
                <img src="${imgCapa}" alt="Deck" onerror="this.src='https://via.placeholder.com/150?text=Deck'">
            </div>

            <div class="stats">
                <span>⚔️ ${deck.stats.attack}</span>
                <span>🛡️ ${deck.stats.defense}</span>
                <span>💧 ${deck.stats.elixir_cost}</span>
            </div>
            <div class="score-tag">Score: ${Math.floor(deck._score)}</div>
        `;
        container.appendChild(div);
    });
}

function openModal(deck) {
    const modal = document.getElementById('modal-details');
    const title = document.getElementById('modal-title');
    const grid = document.getElementById('modal-cards-grid');

    if(title) title.innerText = deck.deck_name;
    if(grid) grid.innerHTML = "";

    deck.cards.forEach(card => {
        const img = document.createElement('img');
        img.src = card.image || 'https://via.placeholder.com/80?text=?';
        img.alt = card.name;
        img.className = 'modal-card-img';
        img.title = card.name;
        grid.appendChild(img);
    });

    if(modal) modal.classList.remove('hidden');
}

// Event Listeners e Setup
function closeModal() {
    const modal = document.getElementById('modal-details');
    if(modal) modal.classList.add('hidden');
}

const closeBtn = document.querySelector('.close-btn');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal-details');
    if (event.target === modal) closeModal();
});

if(inputs.attack) inputs.attack.addEventListener('input', () => { if(!isSorting) quickSortDecks() });
if(inputs.defense) inputs.defense.addEventListener('input', () => { if(!isSorting) quickSortDecks() });
if(inputs.elixir) inputs.elixir.addEventListener('input', () => { if(!isSorting) quickSortDecks() });

const btnQuick = document.getElementById('btn-quick');
const btnBubble = document.getElementById('btn-bubble');

if(btnQuick) btnQuick.addEventListener('click', quickSortDecks);
if(btnBubble) btnBubble.addEventListener('click', slowSortDecks);

// Iniciar
loadData();