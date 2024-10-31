// Initialisation des variables globales
const portfolio = JSON.parse(localStorage.getItem('portfolio')) || {};
const cryptoIds = new Set(Object.keys(portfolio));
const cryptoMap = {};
const alertSettings = JSON.parse(localStorage.getItem('alerts')) || {};
const portfolioHistory = [];
const labelsHistory = [];
let lastPortfolioValue = 0;

// Fonction pour sauvegarder le portefeuille et les alertes dans localStorage
function saveData() {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    localStorage.setItem('alerts', JSON.stringify(alertSettings));
}

// Fonction pour récupérer la liste des 100 cryptomonnaies principales
async function fetchTop100CryptoList() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=100&page=1');
        const data = await response.json();

        data.forEach(crypto => {
            const symbol = crypto.symbol.toLowerCase();
            const id = crypto.id.toLowerCase();
            cryptoMap[symbol] = id;
            cryptoMap[id] = id;
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des 100 cryptomonnaies principales :", error);
    }
}

// Fonction pour récupérer le cours des cryptomonnaies via l'API CoinGecko
async function fetchCryptoPrices() {
    if (cryptoIds.size === 0) return;

    const ids = Array.from(cryptoIds).join(',');
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur`);
        const data = await response.json();
        updateCryptoList(data);
        updatePortfolioValue(data);
        checkAlerts(data);
    } catch (error) {
        console.error("Erreur lors de la récupération du prix :", error);
    }
}

// Fonction pour vérifier et afficher les alertes de prix
function checkAlerts(data) {
    for (const [crypto, price] of Object.entries(data)) {
        if (alertSettings[crypto] && price.eur >= alertSettings[crypto]) {
            alert(`Alerte : ${crypto.toUpperCase()} a atteint ${price.eur} €, prix cible pour vendre ou acheter.`);
            delete alertSettings[crypto];
            saveData();
        }
    }
}

// Mettre à jour la liste des cryptomonnaies avec les cours actuels
function updateCryptoList(data) {
    const cryptoListElement = document.getElementById('crypto-list');
    cryptoListElement.innerHTML = '';

    for (const [crypto, info] of Object.entries(data)) {
        cryptoListElement.innerHTML += `${crypto.charAt(0).toUpperCase() + crypto.slice(1)}: ${info.eur} €<br>`;
    }
}

// Calculer et afficher la valeur du portefeuille
function updatePortfolioValue(data) {
    let totalValue = 0;
    const portfolioListElement = document.getElementById('portfolio-list');
    portfolioListElement.innerHTML = '';

    for (const [crypto, amount] of Object.entries(portfolio)) {
        const price = data[crypto]?.eur || 0;
        const value = price * amount;
        totalValue += value;

        portfolioListElement.innerHTML += `
            <div>
                ${crypto.charAt(0).toUpperCase() + crypto.slice(1)} : ${amount.toFixed(6)} - ${value.toFixed(2)} €
                <span class="icon-btn" onclick="adjustCrypto('${crypto}', 0.001)">➕</span>
                <span class="icon-btn" onclick="adjustCrypto('${crypto}', -0.001)">➖</span>
                <span class="icon-btn" onclick="deleteCrypto('${crypto}')">❌</span>
            </div>
        `;
    }

    document.getElementById('portfolio-value').textContent = `${totalValue.toFixed(2)} €`;

    if (totalValue !== lastPortfolioValue) {
        addDataToChart(totalValue);
        lastPortfolioValue = totalValue;
    }
}

// Fonction pour ajuster la quantité d'une crypto dans le portefeuille
function adjustCrypto(crypto, change) {
    if (portfolio[crypto] !== undefined) {
        portfolio[crypto] += change;
        if (portfolio[crypto] <= 0) {
            delete portfolio[crypto];
            cryptoIds.delete(crypto);
        }
        saveData();
        fetchCryptoPrices();
    }
}

// Fonction pour supprimer une crypto du portefeuille
function deleteCrypto(crypto) {
    delete portfolio[crypto];
    cryptoIds.delete(crypto);
    saveData();
    fetchCryptoPrices();
}

// Fonction pour ajouter une nouvelle cryptomonnaie via le formulaire
document.getElementById('crypto-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const cryptoInput = document.getElementById('crypto-name').value.toLowerCase();
    const cryptoAmount = parseFloat(document.getElementById('crypto-amount').value);

    const cryptoId = cryptoMap[cryptoInput];
    if (!cryptoId) {
        alert("La cryptomonnaie entrée n'est pas reconnue dans les 100 cryptomonnaies principales.");
        return;
    }

    if (cryptoAmount > 0) {
        if (!portfolio[cryptoId]) {
            portfolio[cryptoId] = 0;
            cryptoIds.add(cryptoId);
        }

        portfolio[cryptoId] += cryptoAmount;
        saveData();

        document.getElementById('crypto-name').value = '';
        document.getElementById('crypto-amount').value = '';
        fetchCryptoPrices();
    }
});

// Formulaire pour définir une alerte de prix
document.getElementById('alert-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const cryptoInput = document.getElementById('alert-crypto').value.toLowerCase();
    const alertPrice = parseFloat(document.getElementById('alert-price').value);

    const cryptoId = cryptoMap[cryptoInput];
    if (!cryptoId) {
        alert("La cryptomonnaie entrée n'est pas reconnue dans les 100 cryptomonnaies principales.");
        return;
    }

    if (alertPrice > 0) {
        alertSettings[cryptoId] = alertPrice;
        saveData();

        document.getElementById('alert-crypto').value = '';
        document.getElementById('alert-price').value = '';
        alert(`Alerte définie pour ${cryptoId} à ${alertPrice} €`);
    }
});

// Fonction pour gérer les achats/ventes
document.getElementById('buy-button').addEventListener('click', function() {
    handleTrade('buy');
});

document.getElementById('sell-button').addEventListener('click', function() {
    handleTrade('sell');
});

function handleTrade(type) {
    const cryptoInput = document.getElementById('trade-crypto').value.toLowerCase();
    const tradeAmount = parseFloat(document.getElementById('trade-amount').value);

    const cryptoId = cryptoMap[cryptoInput];
    if (!cryptoId) {
        alert("La cryptomonnaie entrée n'est pas reconnue dans les 100 cryptomonnaies principales.");
        return;
    }

    if (tradeAmount > 0) {
        if (type === 'buy') {
            if (!portfolio[cryptoId]) {
                portfolio[cryptoId] = 0;
                cryptoIds.add(cryptoId);
            }
            portfolio[cryptoId] += tradeAmount;
        } else if (type === 'sell') {
            if (portfolio[cryptoId] !== undefined) {
                portfolio[cryptoId] -= tradeAmount;
                if (portfolio[cryptoId] <= 0) {
                    delete portfolio[cryptoId];
                    cryptoIds.delete(cryptoId);
                }
            } else {
                alert("Quantité invalide ou crypto non détenue.");
                return;
            }
        }
        saveData();
        document.getElementById('trade-crypto').value = '';
        document.getElementById('trade-amount').value = '';
        fetchCryptoPrices();
    }
}

// Configuration du graphique
const ctx = document.getElementById('portfolioChart').getContext('2d');
const portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labelsHistory,
        datasets: Object.keys(portfolio).map((crypto, index) => ({
            label: crypto.charAt(0).toUpperCase() + crypto.slice(1),
            data: portfolioHistory.map(history => history[crypto] || 0),
            borderColor: `hsl(${index * 30 % 360}, 100%, 50%)`,
            borderWidth: 2,
            fill: false
        }))
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Temps' } },
            y: { title: { display: true, text: 'Valeur (€)' } }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        }
    }
});

// Ajouter les nouvelles données au graphique
function addDataToChart(totalValue) {
    const currentTime = new Date().toLocaleTimeString();
    labelsHistory.push(currentTime);
    
    // Mise à jour de chaque dataset
    Object.keys(portfolio).forEach(crypto => {
        if (!portfolioChart.data.datasets.some(ds => ds.label.toLowerCase() === crypto)) {
            portfolioChart.data.datasets.push({
                label: crypto.charAt(0).toUpperCase() + crypto.slice(1),
                data: [],
                borderColor: `hsl(${portfolioChart.data.datasets.length * 30 % 360}, 100%, 50%)`,
                borderWidth: 2,
                fill: false
            });
        }
    });

    portfolioChart.data.datasets.forEach(dataset => {
        dataset.data.push(portfolio[dataset.label.toLowerCase()] || 0);
    });

    if (labelsHistory.length > 10) {
        labelsHistory.shift();
        portfolioChart.data.datasets.forEach(dataset => {
            dataset.data.shift();
        });
    }
    portfolioChart.update();
}

// Initialiser l'application
fetchTop100CryptoList();
fetchCryptoPrices();
setInterval(fetchCryptoPrices, 60000);

