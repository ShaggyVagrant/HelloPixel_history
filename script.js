// script.js — финальная оптимизированная версия

// --- КОНФИГУРАЦИЯ ---
const API_BASE_URL = 'https://songbird-explorer.flare.network/api/v2';
const ITEMS_PER_PAGE = 20;
const INITIAL_LOAD_PAGES = 3;
const DEBOUNCE_DELAY = 200; // мс для задержки фильтрации

// --- КОНФИГУРАЦИОННЫЙ ОБЪЕКТ ---
const CONFIG = {
    // Сигнатуры методов (первые 4 байта input)
    SIGNATURES: {
        '0xa9059cbb': 'transfer',
        '0x23b872dd': 'transferFrom',
        '0x095ea7b3': 'approve',
        '0x40c10f19': 'mint',
        '0x42966c68': 'burn',
        '0x2e1a7d4d': 'withdraw',
        '0x7f6b0b8a': 'mintForOne',
        '0x4a25d94a': 'burn',
        '0x3d95e3b2': 'createOrder',
        '0x4c0f3b1a': 'executeOrder',
        '0x8d7c5f2e': 'claimFreeChest',
        '0x9abcdef0': 'returnDroneAndClaimReward',
        '0x56789abc': 'purchaseChestForPXLs',
        '0x3b5a0c1e': 'operatorBurnFrom',
        '0x4b8c3a2e': 'buySizeLevel',
        '0x5c2d4a1f': 'equip',
        '0x6a3e2b1d': 'unequip',
        '0x7f4c2a3e': 'craft',
        '0x8d5b1c3a': 'cancelOrder',
        '0x9e2c4a5b': 'buySpeedLevel',
        '0x01ce3d65': 'upgradeMine',
        '0x1a2b3c4d': 'claimForUser',
        '0x2b3c4d5e': 'claimReward',
        '0xa7c83989': 'transferFromUser'
    },
    // События
    EVENTS: {
        'Transfer': 'transfer',
        'Approval': 'approve',
        'Mint': 'mintForOne',
        'Burn': 'burn',
        'OrderCreated': 'createOrder',
        'OrderExecuted': 'executeOrder',
        'ChestClaimed': 'claimFreeChest',
        'Start': 'start',
        'Stop': 'stop',
        'ReturnDroneAndClaimReward': 'returnDroneAndClaimReward',
        'PurchaseChestForPXLs': 'purchaseChestForPXLs',
        'OperatorBurnFrom': 'operatorBurnFrom',
        'BuySizeLevel': 'buySizeLevel',
        'Equip': 'equip',
        'Unequip': 'unequip',
        'Craft': 'craft',
        'CancelOrder': 'cancelOrder',
        'BuySpeedLevel': 'buySpeedLevel',
        'UpgradeMine': 'upgradeMine',
        'ClaimForUser': 'claimForUser',
        'ClaimReward': 'claimReward'
    },
    // Специальные условия (адреса, символы токенов)
    SPECIALS: {
        // Пополнение синдиката
        popolnenie_sindikata: [
            { method: 'operatorBurnFrom', tokenSymbol: ['PXLD', 'PXLDust'], tokenName: 'PXLDust' },
            { method: 'burn', tokenSymbol: ['PXLs'], tokenName: 'Pixel Shard' },
            { method: 'transferFrom', toAddress: '0x4BF7a440F0A1D576A0D8d7397480585A89fdC7de' }
        ],
        // Прокачка хранилища
        prokachka_hranilisha: { method: 'buySizeLevel', toAddress: '0x0000000000000000000000000000000000000000' },
        // Прокачка дрели
        prokachka_dreli: { method: 'buySpeedLevel', toAddress: '0x0000000000000000000000000000000000000000' },
        // Распаковка пыли
        raspakovka_pyli: {
            method: 'transferFromUser',
            fromAddress: '0xF2279eBf926ee1dAf3F539C3ab2DD0ea97ca6b24',
            tokenSymbol: ['PXLD'],
            tokenName: 'PXLDust'
        }
    }
};

// --- DOM-ЭЛЕМЕНТЫ ---
const addressInput = document.getElementById('addressInput');
const addressHistoryDatalist = document.getElementById('addressHistory');
const tokenTypeFilter = document.getElementById('tokenTypeFilter');
const fetchBtn = document.getElementById('fetchBtn');
const statusMessage = document.getElementById('statusMessage');

const statsBlock = document.getElementById('statsBlock');
const totalCount = document.getElementById('totalCount');
const displayedCount = document.getElementById('displayedCount');

const showIncomingCheck = document.getElementById('showOnlyIncoming');
const showOnlyOutgoingCheck = document.getElementById('showOnlyOutgoing');
const methodCheckboxes = document.querySelectorAll('.method-checkbox');

const paginationControlsTop = document.getElementById('paginationControlsTop');
const paginationControlsBottom = document.getElementById('paginationControlsBottom');

const pageNumbersTop = document.getElementById('pageNumbersTop');
const pageNumbersBottom = document.getElementById('pageNumbersBottom');

const firstPageBtns = document.querySelectorAll('.firstPageBtn');
const prevPageBtns = document.querySelectorAll('.prevPageBtn');
const nextPageBtns = document.querySelectorAll('.nextPageBtn');
const lastPageBtns = document.querySelectorAll('.lastPageBtn');
const loadMoreBtns = document.querySelectorAll('.load-more-btn');

const filtersHeader = document.getElementById('filtersHeader');
const filtersToggle = document.getElementById('filtersToggle');
const filtersContent = document.getElementById('filtersContent');

const transfersBody = document.getElementById('transfersBody');

// --- СОСТОЯНИЕ ---
let currentAddress = '';
let allTransfers = [];
let filteredTransfers = [];
let currentPage = 1;
let nextPageParams = null;
let isLoading = false;
let isFilterLoading = false;
let totalLoadedPages = 0;
let debounceTimer = null;

// --- ХЕЛПЕРЫ ---
function getAddress(obj) {
    return obj?.hash || obj?.address || '';
}

function isIncoming(transfer) {
    const to = getAddress(transfer.to);
    return to.toLowerCase() === currentAddress.toLowerCase();
}

// --- КОНСТАНТЫ МЕТОДОВ (цвета и метки) ---
const METHOD_COLORS = {
    'mintForOne': 'method-mintForOne',
    'burn': 'method-burn',
    'createOrder': 'method-createOrder',
    'executeOrder': 'method-executeOrder',
    'claimFreeChest': 'method-claimFreeChest',
    'start': 'method-start',
    'returnDroneAndClaimReward': 'method-returnDroneAndClaimReward',
    'purchaseChestForPXLs': 'method-purchaseChestForPXLs',
    'popolnenie_sindikata': 'method-popolnenie_sindikata',
    'prokachka_hranilisha': 'method-prokachka_hranilisha',
    'prokachka_dreli': 'method-prokachka_dreli',
    'equip': 'method-equip',
    'unequip': 'method-unequip',
    'craft': 'method-craft',
    'cancelOrder': 'method-cancelOrder',
    'claimForUser': 'method-claimForUser',
    'claimReward': 'method-claimReward',
    'transfer': 'method-transfer',
    'upgradeMine': 'method-upgradeMine',
    'mint': 'method-mint',
    'raspakovka_pyli': 'method-raspakovka_pyli',
    'unknown': 'method-unknown',
    'other': 'method-other'
};

const METHOD_LABELS = {
    'mintForOne': 'От команды (ЛБ, за рефов)',
    'burn': 'Крафт',
    'createOrder': 'Выставлен на продажу',
    'executeOrder': 'Куплен на рынке',
    'claimFreeChest': 'Открыть сундук',
    'start': 'Запуск УС',
    'returnDroneAndClaimReward': 'Клейм пыли',
    'purchaseChestForPXLs': 'Куплен дрон за PXLs',
    'popolnenie_sindikata': 'Пополнение синдиката',
    'prokachka_hranilisha': 'Прокачка хранилища',
    'upgradeMine': 'Прокачка шахты',
    'prokachka_dreli': 'Прокачка дрели',
    'equip': 'Надеть NFT',
    'unequip': 'Снять NFT',
    'craft': 'Крафт по рецепту',
    'cancelOrder': 'Снято с продажи',
    'claimForUser': 'Автоклейм',
    'claimReward': 'Ручной клейм',
    'mint': 'Запаковка пыли',
    'raspakovka_pyli': 'Распаковка пыли',
    'transfer': 'transfer',
    'unknown': 'неизвестно'
};

// --- ИСТОРИЯ АДРЕСОВ ---
function loadAddressHistory() {
    try { return JSON.parse(localStorage.getItem('addressHistory')) || []; } catch { return []; }
}
function saveAddressHistory(address) {
    if (!address) return;
    let history = loadAddressHistory();
    history = history.filter(addr => addr.toLowerCase() !== address.toLowerCase());
    history.unshift(address);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('addressHistory', JSON.stringify(history));
    updateDatalist(history);
}
function updateDatalist(history) {
    addressHistoryDatalist.innerHTML = '';
    history.forEach(addr => {
        const option = document.createElement('option');
        option.value = addr;
        addressHistoryDatalist.appendChild(option);
    });
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function truncateHash(hash, chars = 6) {
    if (!hash) return '—';
    if (hash.length <= chars * 2 + 2) return hash;
    return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// --- КЕШИРОВАННОЕ ОПРЕДЕЛЕНИЕ МЕТОДА ---
function getMethod(tx) {
    if (tx._detectedMethod) return tx._detectedMethod;
    const method = detectMethod(tx);
    tx._detectedMethod = method;
    return method;
}

// --- ОСНОВНАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ МЕТОДА ---
function detectMethod(tx) {
    let method = tx.method || tx.method_name || null;
    if (!method && tx.input && tx.input.length >= 10) {
        const signature = tx.input.slice(0, 10);
        method = CONFIG.SIGNATURES[signature] || null;
    }
    if (!method && tx.log_events && tx.log_events.length > 0) {
        const event = tx.log_events[0];
        if (event && event.event_name) {
            method = CONFIG.EVENTS[event.event_name] || null;
        }
    }
    if (!method && tx.token && tx.token.type === 'ERC-20') {
        method = 'transfer';
    }
    if (method) {
        const tokenSymbol = (tx.token?.symbol || '').toUpperCase();
        const tokenName = (tx.token?.name || '').toUpperCase();
        const toAddress = getAddress(tx.to).toLowerCase();
        const fromAddress = getAddress(tx.from).toLowerCase();

        // --- Пополнение синдиката ---
        const popolnenieRules = CONFIG.SPECIALS.popolnenie_sindikata;
        for (const rule of popolnenieRules) {
            if (method !== rule.method) continue;
            let match = true;
            if (rule.tokenSymbol) {
                const symbols = rule.tokenSymbol.map(s => s.toUpperCase());
                const found = symbols.some(sym => tokenSymbol.includes(sym));
                if (!found) match = false;
            }
            if (rule.tokenName && !tokenName.includes(rule.tokenName.toUpperCase())) match = false;
            if (rule.toAddress && toAddress !== rule.toAddress.toLowerCase()) match = false;
            if (match) return 'popolnenie_sindikata';
        }

        // --- Прокачка хранилища ---
        const storeRule = CONFIG.SPECIALS.prokachka_hranilisha;
        if (method === storeRule.method && toAddress === storeRule.toAddress.toLowerCase()) {
            return 'prokachka_hranilisha';
        }

        // --- Прокачка дрели ---
        const drillRule = CONFIG.SPECIALS.prokachka_dreli;
        if (method === drillRule.method && toAddress === drillRule.toAddress.toLowerCase()) {
            return 'prokachka_dreli';
        }

        // --- Распаковка пыли ---
        const dustRule = CONFIG.SPECIALS.raspakovka_pyli;
        if (method === dustRule.method &&
            fromAddress === dustRule.fromAddress.toLowerCase()) {
            const symbols = dustRule.tokenSymbol.map(s => s.toUpperCase());
            const found = symbols.some(sym => tokenSymbol.includes(sym));
            if (found || tokenName.includes(dustRule.tokenName.toUpperCase())) {
                return 'raspakovka_pyli';
            }
        }
    }
    return method || 'other';
}

function getMethodClass(method) {
    return METHOD_COLORS[method] || METHOD_COLORS.other;
}
function getMethodLabel(method) {
    return METHOD_LABELS[method] || method || 'другой';
}
function getTokenTypeBadge(type) {
    if (!type) return '<span class="badge badge-erc20">ERC-20</span>';
    const map = { 'ERC-20': 'badge-erc20', 'ERC-721': 'badge-erc721', 'ERC-1155': 'badge-erc1155' };
    const cls = map[type] || 'badge-erc20';
    return `<span class="badge ${cls}">${type}</span>`;
}
function getDateFromTransfer(transfer) {
    let ts = transfer.timestamp || transfer.block_timestamp || transfer.time ||
             transfer.created_at || transfer.date || transfer.timestamp_utc ||
             transfer.timestamp_in_seconds || transfer.timestamp_unix;
    if (!ts && transfer.block) ts = transfer.block.timestamp || transfer.block.block_timestamp;
    if (!ts && transfer.transaction) ts = transfer.transaction.timestamp;
    if (ts === undefined || ts === null || ts === '') return '—';
    let timestampMs;
    if (typeof ts === 'string') {
        const parsed = Date.parse(ts);
        if (!isNaN(parsed)) timestampMs = parsed;
        else {
            const num = parseFloat(ts);
            if (!isNaN(num)) timestampMs = num;
            else return '—';
        }
    } else if (typeof ts === 'number') {
        timestampMs = ts;
    } else return '—';
    if (timestampMs < 1e12) timestampMs = timestampMs * 1000;
    const date = new Date(timestampMs);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
function getSelectedMethods() {
    const selected = [];
    let allChecked = false;
    methodCheckboxes.forEach(cb => {
        const method = cb.dataset.method;
        if (method === 'all') allChecked = cb.checked;
        else if (cb.checked) selected.push(method);
    });
    if (allChecked || selected.length === 0) return null;
    return selected;
}

// --- API: получение цены для executeOrder и createOrder ---
async function fetchTransactionPrice(txHash, method) {
    try {
        const url = `${API_BASE_URL}/transactions/${txHash}`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) return null;
        const data = await response.json();
        if (data.decoded_input && data.decoded_input.parameters) {
            const priceParamName = method === 'createOrder' ? 'priceInWei' : 'price';
            const priceParam = data.decoded_input.parameters.find(p => p.name === priceParamName);
            if (priceParam && priceParam.value) {
                const num = parseFloat(priceParam.value);
                if (!isNaN(num)) {
                    return (num / 1e18).toFixed(6);
                }
            }
        }
        return null;
    } catch (e) {
        console.error(`Ошибка при получении цены для ${txHash}:`, e);
        return null;
    }
}

// --- ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ЦЕН (пачками) ---
async function enrichWithPrices(transfers) {
    const orders = transfers.filter(t => {
        const method = getMethod(t);
        return method === 'executeOrder' || method === 'createOrder';
    });
    if (orders.length === 0) return;

    const chunkSize = 5;
    const chunks = [];
    for (let i = 0; i < orders.length; i += chunkSize) {
        chunks.push(orders.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (tx) => {
            if (!tx._price) {
                const method = getMethod(tx);
                const price = await fetchTransactionPrice(tx.transaction_hash, method);
                tx._price = price !== null ? price : '—';
            }
        }));
    }
}

function applyFilters(transfers) {
    let result = [...transfers];

    const incoming = showIncomingCheck.checked;
    const outgoing = showOnlyOutgoingCheck.checked;

    // Если включены оба или ни один — показываем все
    if (incoming && outgoing) {
        // ничего не фильтруем
    } else if (incoming) {
        result = result.filter(t => {
            const to = getAddress(t.to);
            return to.toLowerCase() === currentAddress.toLowerCase();
        });
    } else if (outgoing) {
        result = result.filter(t => {
            const from = getAddress(t.from);
            return from.toLowerCase() === currentAddress.toLowerCase();
        });
    }
    // Если ни один не включён — ничего не фильтруем

    const selectedMethods = getSelectedMethods();
    if (selectedMethods !== null && selectedMethods.length > 0) {
        result = result.filter(t => {
            const method = getMethod(t);
            return selectedMethods.includes(method);
        });
    }
    return result;
}

// --- Рендеринг строки таблицы ---
function renderTransferRow(transfer) {
    const tr = document.createElement('tr');
    const method = getMethod(transfer);
    const incoming = isIncoming(transfer);
    const amount = parseFloat(transfer.total?.value || transfer.value || 0);
    const decimals = transfer.token?.decimals || 18;
    const formattedAmount = (amount / Math.pow(10, decimals)).toFixed(6);
    const amountClass = incoming ? 'incoming' : 'outgoing';
    const amountSign = incoming ? '+' : '-';
    const methodClass = getMethodClass(method);
    const methodLabel = getMethodLabel(method);
    const dateStr = getDateFromTransfer(transfer);

    // --- Разбиваем дату на две строки ---
    let datePart = '—';
    let timePart = '—';
    if (dateStr !== '—') {
        const parts = dateStr.split(', ');
        if (parts.length === 2) {
            datePart = parts[0];
            timePart = parts[1];
        } else {
            datePart = dateStr;
        }
    }

    let tokenId = transfer.total?.token_id || transfer.token_id || transfer.tokenId || '';
    if (tokenId && typeof tokenId === 'string' && tokenId.startsWith('0x')) {
        tokenId = truncateHash(tokenId, 6);
    } else if (typeof tokenId === 'number' || (typeof tokenId === 'string' && !isNaN(tokenId))) {
        tokenId = String(tokenId);
    } else {
        tokenId = '';
    }

    const tokenType = transfer.token?.type || transfer.token_type || '';
    const tokenSymbol = (transfer.token?.symbol || '').toUpperCase();
    const tokenName = (transfer.token?.name || '').toUpperCase();

    const isPXLNFT = tokenSymbol.includes('PXLNFT') || tokenName.includes('PIXEL ITEM NFT');
    const isNFT = tokenType === 'ERC-721' || tokenType === 'ERC-1155';
    const isEquipUnequip = method === 'equip' || method === 'unequip';

    const showTokenId = (isPXLNFT || isNFT || (isEquipUnequip && tokenId)) && tokenId;

    let tokenIdLink = '—';
    if (showTokenId && tokenId) {
        const encodedTokenId = encodeURIComponent(tokenId);
        tokenIdLink = `<a href="./NFT/NFT_1.html?tokenId=${encodedTokenId}" target="_blank" class="token-link">${tokenId}</a>`;
    }

    let price = '—';
    if (method === 'executeOrder' || method === 'createOrder') {
        price = transfer._price || '⏳';
    }

    tr.innerHTML = `
        <td data-label="Дата" class="col-date">
            <div class="date-cell">
                <span class="date-part">${datePart}</span>
                <span class="time-part">${timePart}</span>
            </div>
        </td>
        <td data-label="Хэш" class="col-hash">
            <a href="https://songbird-explorer.flare.network/tx/${transfer.transaction_hash}" target="_blank" class="hash cell-value">${truncateHash(transfer.transaction_hash, 8)}</a>
        </td>
        <td data-label="Токен" class="col-token">
            <span class="token-symbol cell-value">${transfer.token?.symbol || '—'}</span>
        </td>
        <td data-label="Отправитель" class="col-from">
            <a href="https://songbird-explorer.flare.network/address/${getAddress(transfer.from)}" target="_blank" class="hash cell-value">${truncateHash(getAddress(transfer.from), 8)}</a>
        </td>
        <td data-label="Получатель" class="col-to">
            <a href="https://songbird-explorer.flare.network/address/${getAddress(transfer.to)}" target="_blank" class="hash cell-value">${truncateHash(getAddress(transfer.to), 8)}</a>
        </td>
        <td data-label="Сумма" class="col-amount">
            <span class="amount ${amountClass} cell-value">${amountSign} ${formattedAmount}</span>
        </td>
        <td data-label="Тип" class="col-type">
            <span class="cell-value">${getTokenTypeBadge(transfer.token?.type || transfer.token_type)}</span>
        </td>
        <td data-label="Метод" class="col-method">
            <span class="method-tag ${methodClass} cell-value">${methodLabel}</span>
        </td>
        <td data-label="Token ID" class="col-tokenid token-id">
            <span class="cell-value">${tokenIdLink}</span>
        </td>
        <td data-label="Price" class="col-price price">
            <span class="cell-value">${price}</span>
        </td>
    `;
    return tr;
}

// --- Рендеринг таблицы (с использованием DocumentFragment) ---
function renderTransfers(forceApply = true) {
    if (forceApply) {
        filteredTransfers = applyFilters(allTransfers);
    }

    statsBlock.style.display = 'block';
    totalCount.textContent = allTransfers.length;
    displayedCount.textContent = filteredTransfers.length;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = filteredTransfers.slice(start, end);
    const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE) || 1;

    prevPageBtns.forEach(btn => btn.disabled = currentPage <= 1);
    nextPageBtns.forEach(btn => btn.disabled = currentPage >= totalPages);
    firstPageBtns.forEach(btn => btn.disabled = currentPage <= 1);
    lastPageBtns.forEach(btn => btn.disabled = currentPage >= totalPages);

    const hasMoreData = !!nextPageParams;
    loadMoreBtns.forEach(btn => {
        btn.disabled = !hasMoreData;
        btn.style.opacity = hasMoreData ? '1' : '0.5';
    });

    const showPagination = (filteredTransfers.length > 0) || hasMoreData;
    paginationControlsTop.style.display = showPagination ? 'flex' : 'none';
    paginationControlsBottom.style.display = showPagination ? 'flex' : 'none';

    transfersBody.innerHTML = '';
    if (pageItems.length === 0) {
        let message;
        if (allTransfers.length === 0) {
            message = 'Нет данных по этому адресу';
        } else if (filteredTransfers.length === 0 && !hasMoreData) {
            message = 'По выбранному фильтру транзакций не найдено во всей истории.';
        } else if (filteredTransfers.length === 0 && hasMoreData) {
            message = 'По вашему фильтру не найдено транзакций в загруженных страницах. Нажмите "Загрузить ещё" для продолжения поиска.';
        } else {
            message = 'Нет данных, соответствующих фильтрам';
        }
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="10" class="empty-state">${message}</td>`;
        transfersBody.appendChild(emptyRow);
        return;
    }

    // Используем DocumentFragment для ускорения рендеринга
    const fragment = document.createDocumentFragment();
    pageItems.forEach(transfer => fragment.appendChild(renderTransferRow(transfer)));
    transfersBody.appendChild(fragment);
    renderPageNumbers();
}

// --- РЕНДЕРИНГ НОМЕРОВ СТРАНИЦ ---
function renderPageNumbers() {
    const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE) || 1;
    const current = currentPage;

    function getPageNumbersHTML() {
        let html = '';
        const maxVisible = 7;
        let startPage = 1;
        let endPage = totalPages;

        if (totalPages > maxVisible) {
            const half = Math.floor(maxVisible / 2);
            if (current <= half + 1) {
                startPage = 1;
                endPage = maxVisible;
            } else if (current >= totalPages - half) {
                startPage = totalPages - maxVisible + 1;
                endPage = totalPages;
            } else {
                startPage = current - half;
                endPage = current + half;
            }
        }

        if (startPage > 1) {
            html += `<button class="page-number" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="page-number ellipsis">…</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === current;
            html += `<button class="page-number ${isActive ? 'active' : ''}" data-page="${i}" ${isActive ? 'disabled' : ''}>${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="page-number ellipsis">…</span>`;
            }
            html += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
        }

        return html;
    }

    const html = getPageNumbersHTML();
    pageNumbersTop.innerHTML = html;
    pageNumbersBottom.innerHTML = html;

    document.querySelectorAll('.page-number:not(.ellipsis):not([disabled])').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (!isNaN(page) && page !== currentPage) {
                goToPage(page);
            }
        });
    });
}

// --- Загрузка цен (обёртка) ---
async function loadPricesAndRender() {
    filteredTransfers = applyFilters(allTransfers);
    const needPrice = filteredTransfers.some(t => {
        const method = getMethod(t);
        return (method === 'executeOrder' || method === 'createOrder') && !t._price;
    });
    if (needPrice) {
        showStatus('Загрузка цен для покупок...', 'info');
        await enrichWithPrices(filteredTransfers);
    }
    renderTransfers(true);
}

// --- API ЗАПРОСЫ ---
async function fetchTokenTransfers(address, tokenType = '', pageParams = null) {
    const url = new URL(`${API_BASE_URL}/addresses/${address}/token-transfers`);
    if (tokenType) url.searchParams.append('type', tokenType);
    if (pageParams) {
        for (const [key, value] of Object.entries(pageParams)) {
            url.searchParams.append(key, value);
        }
    }
    url.searchParams.append('items_count', ITEMS_PER_PAGE);
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка ${response.status}: ${errorText}`);
    }
    return response.json();
}

// --- ЗАГРУЗКА ДОПОЛНИТЕЛЬНЫХ СТРАНИЦ (по кнопке) с защитой от дубликатов ---
async function loadMorePages(count = 1, showIndicator = false) {
    if (showIndicator) {
        setLoadMoreButtonLoading(true);
        showLoadingIndicator(true);
    }
    let loaded = 0;
    let currentNext = nextPageParams;
    while (loaded < count && currentNext && !isLoading) {
        try {
            const data = await fetchTokenTransfers(currentAddress, tokenTypeFilter.value, currentNext);
            const newItems = data.items || [];

            const existingKeys = new Set(allTransfers.map(t => `${t.transaction_hash}-${t.log_index}`));
            const uniqueNew = newItems.filter(t => !existingKeys.has(`${t.transaction_hash}-${t.log_index}`));

            if (uniqueNew.length === 0) {
                currentNext = data.next_page_params || null;
                nextPageParams = currentNext;
                continue;
            }

            uniqueNew.forEach(t => getMethod(t));
            allTransfers = [...allTransfers, ...uniqueNew];
            currentNext = data.next_page_params || null;
            nextPageParams = currentNext;
            loaded++;
            totalLoadedPages++;
        } catch (error) {
            console.error('Ошибка при догрузке:', error);
            showStatus(`Ошибка при догрузке: ${error.message}`, 'error');
            break;
        }
    }
    if (showIndicator) {
        setLoadMoreButtonLoading(false);
        showLoadingIndicator(false);
    }
    return loaded;
}

// --- ОСНОВНАЯ ЗАГРУЗКА ИСТОРИИ ---
async function loadHistory(address, tokenType = '', initialLoad = false) {
    if (!address || !address.startsWith('0x')) {
        showStatus('Пожалуйста, введите корректный адрес', 'error');
        return;
    }
    if (isLoading) return;
    isLoading = true;
    fetchBtn.disabled = true;
    showStatus('Загрузка данных...', 'info');

    try {
        currentPage = 1;
        nextPageParams = null;
        allTransfers = [];
        totalLoadedPages = 0;

        const data = await fetchTokenTransfers(address, tokenType);
        currentAddress = address;
        allTransfers = data.items || [];
        nextPageParams = data.next_page_params || null;
        totalLoadedPages = 1;
        allTransfers.forEach(t => getMethod(t));

        saveAddressHistory(address);

        if (initialLoad && nextPageParams) {
            const pagesToLoad = Math.min(INITIAL_LOAD_PAGES - 1, 5);
            await loadMorePages(pagesToLoad, true);
        }

        filteredTransfers = applyFilters(allTransfers);
        showStatus(`Загружено всего ${allTransfers.length} трансферов (${totalLoadedPages} страниц)`, 'success');
    } catch (error) {
        console.error('Ошибка:', error);
        showStatus(`Ошибка загрузки: ${error.message}`, 'error');
        allTransfers = [];
        filteredTransfers = [];
    } finally {
        isLoading = false;
        fetchBtn.disabled = false;
        await loadPricesAndRender();
        if (initialLoad && nextPageParams && filteredTransfers.length < ITEMS_PER_PAGE) {
            showStatus(`Показано ${filteredTransfers.length} записей. Нажмите "Загрузить ещё" для продолжения.`, 'info');
        }
    }
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    if (type) statusMessage.classList.add(type);
    statusMessage.style.display = 'block';
}

// --- ОСНОВНАЯ ЛОГИКА ПРИ СМЕНЕ ФИЛЬТРА (с debounce) ---
function onFilterChange() {
    if (isFilterLoading) return;
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    debounceTimer = setTimeout(async () => {
        if (isFilterLoading) return;
        isFilterLoading = true;
        currentPage = 1;

        try {
            filteredTransfers = applyFilters(allTransfers);
            renderTransfers(true);

            const needPrice = filteredTransfers.some(t => {
                const method = getMethod(t);
                return (method === 'executeOrder' || method === 'createOrder') && !t._price;
            });
            if (needPrice) {
                (async () => {
                    showStatus('Загрузка цен для покупок...', 'info');
                    await enrichWithPrices(filteredTransfers);
                    renderTransfers(false);
                })();
            }

            const pageItems = filteredTransfers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            if (filteredTransfers.length === 0 && nextPageParams) {
                showStatus('По вашему фильтру нет записей в загруженных страницах. Нажмите "Загрузить ещё" для поиска.', 'info');
            } else if (filteredTransfers.length === 0 && !nextPageParams) {
                showStatus('По выбранному фильтру транзакций не найдено во всей истории.', 'info');
            } else if (filteredTransfers.length > 0 && pageItems.length < ITEMS_PER_PAGE && nextPageParams) {
                showStatus(`Показано ${filteredTransfers.length} записей. Нажмите "Загрузить ещё" для загрузки следующих страниц.`, 'info');
            } else {
                showStatus(`Найдено ${filteredTransfers.length} записей.`, 'success');
            }
        } finally {
            isFilterLoading = false;
            debounceTimer = null;
        }
    }, DEBOUNCE_DELAY);
}

// --- НАВИГАЦИЯ (без API-запросов) ---
function goToFirstPage() {
    goToPage(1);
}
function goToLastPage() {
    const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE) || 1;
    goToPage(totalPages);
}
function goToPrevPage() {
    goToPage(currentPage - 1);
}
function goToNextPage() {
    goToPage(currentPage + 1);
}

// --- ПЕРЕХОД НА КОНКРЕТНУЮ СТРАНИЦУ ---
function goToPage(page) {
    const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE) || 1;
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    renderTransfers();
}

// --- Кнопка "Загрузить ещё" (единственное место для API-запросов) ---
async function loadMoreHandler() {
    if (!nextPageParams || isLoading) return;
    try {
        const loaded = await loadMorePages(1, true);
        if (loaded > 0) {
            showStatus(`Загружено ещё ${loaded * ITEMS_PER_PAGE} записей. Всего: ${allTransfers.length}`, 'success');
            filteredTransfers = applyFilters(allTransfers);
            renderTransfers(false);
            const needPrice = filteredTransfers.some(t => {
                const method = getMethod(t);
                return (method === 'executeOrder' || method === 'createOrder') && !t._price;
            });
            if (needPrice) {
                showStatus('Загрузка цен для покупок...', 'info');
                await enrichWithPrices(filteredTransfers);
                renderTransfers(false);
            }
        } else {
            showStatus('Больше данных нет', 'info');
        }
    } catch (error) {
        showStatus(`Ошибка: ${error.message}`, 'error');
    }
}

// --- ИНДИКАЦИЯ ЗАГРУЗКИ ---
let loadingIndicatorShown = false;
function showLoadingIndicator(show = true) {
    if (show) {
        if (!loadingIndicatorShown) {
            const row = document.createElement('tr');
            row.id = 'loadingIndicatorRow';
            row.innerHTML = `<td colspan="10" class="loading-indicator">
                <span class="spinner"></span> Загрузка данных...
            </td>`;
            transfersBody.appendChild(row);
            loadingIndicatorShown = true;
        }
    } else {
        const row = document.getElementById('loadingIndicatorRow');
        if (row) row.remove();
        loadingIndicatorShown = false;
    }
}
function setLoadMoreButtonLoading(loading = false) {
    loadMoreBtns.forEach(btn => {
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Загрузка...';
            btn.style.opacity = '1';
        } else {
            btn.disabled = !nextPageParams;
            btn.innerHTML = 'Загрузить ещё';
            btn.style.opacity = nextPageParams ? '1' : '0.5';
        }
    });
}

// --- СВОРАЧИВАНИЕ ФИЛЬТРОВ ---
const filtersCollapsed = localStorage.getItem('filtersCollapsed') === 'true';

if (filtersCollapsed) {
    filtersContent.classList.add('collapsed');
    filtersToggle.classList.add('collapsed');
}

function toggleFilters() {
    const isCollapsed = filtersContent.classList.toggle('collapsed');
    filtersToggle.classList.toggle('collapsed');
    localStorage.setItem('filtersCollapsed', isCollapsed);
}

filtersHeader.addEventListener('click', (e) => {
    if (e.target.closest('.filters-toggle')) return;
    toggleFilters();
});

filtersToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFilters();
});

// --- ПРИВЯЗКА СОБЫТИЙ ---
fetchBtn.addEventListener('click', () => {
    const address = addressInput.value.trim();
    if (!address || !address.startsWith('0x')) {
        showStatus('Пожалуйста, введите корректный адрес (начинается с 0x)', 'error');
        return;
    }
    const tokenType = tokenTypeFilter.value;
    loadHistory(address, tokenType, false);
});

addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchBtn.click();
});

showIncomingCheck.addEventListener('change', onFilterChange);
showOnlyOutgoingCheck.addEventListener('change', onFilterChange);

methodCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const method = this.dataset.method;
        if (method === 'all') {
            if (this.checked) {
                methodCheckboxes.forEach(cb => {
                    if (cb.dataset.method !== 'all') cb.checked = false;
                });
            }
        } else {
            const allCheckbox = document.querySelector('.method-checkbox[data-method="all"]');
            if (allCheckbox) allCheckbox.checked = false;
            const anySelected = Array.from(methodCheckboxes).some(cb =>
                cb.dataset.method !== 'all' && cb.checked
            );
            if (!anySelected && allCheckbox) allCheckbox.checked = true;
        }

        const startCheckbox = document.querySelector('.method-checkbox[data-method="start"]');
        const claimForUserCheckbox = document.querySelector('.method-checkbox[data-method="claimForUser"]');
        if (startCheckbox && claimForUserCheckbox && startCheckbox.checked) {
            claimForUserCheckbox.checked = true;
        }

        onFilterChange();
    });
});

firstPageBtns.forEach(btn => btn.addEventListener('click', goToFirstPage));
prevPageBtns.forEach(btn => btn.addEventListener('click', goToPrevPage));
nextPageBtns.forEach(btn => btn.addEventListener('click', goToNextPage));
lastPageBtns.forEach(btn => btn.addEventListener('click', goToLastPage));
loadMoreBtns.forEach(btn => btn.addEventListener('click', loadMoreHandler));

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    const history = loadAddressHistory();
    updateDatalist(history);

    if (history.length > 0) {
        const lastAddress = history[0];
        addressInput.value = lastAddress;
        loadHistory(lastAddress, '', true);
    } else {
        addressInput.value = '';
        showStatus('Введите адрес кошелька и нажмите "Получить историю"', 'info');
    }
});
