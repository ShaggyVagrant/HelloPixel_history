let web3;
let contract;
let collections;
let contractAddress;


// Массив редкости
const rarityArray = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const NFTparam = ["Drill speed", "Storage capacity", "Referral storage capacity", "3", "4", "5", "Drill upgrade discount", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];

// Инициализация Web3 и контракта
async function initWeb3() {
    const network = document.querySelector('input[name="network"]:checked').value;
    let rpcUrl;
    if (network === 'songbird') {
        rpcUrl = 'https://songbird-api.flare.network/ext/bc/C/rpc';
        contractAddress = '0x41a7435EF2CBd77df7C6966Af4E62a9B12416398';
    } else if (network === 'skale') {
        rpcUrl = 'https://mainnet.skalenodes.com/v1/elated-tan-skat';
        contractAddress = '0xcB48dF8e2FE472D8Be277348683bBD401Cab6201';
    }

    web3 = new Web3(rpcUrl);
    contract = new web3.eth.Contract(window.pixelNFTABI, contractAddress);
    collections = await contract.methods.getCollections().call();
}

// Функция для обработки variants
function processVariants(variants) {
    if (!variants || !Array.isArray(variants)) {
        console.warn('Variants is not an array:', variants);
        return [];
    }

    return variants.map(variantArray =>
        variantArray.map(variant => {
            // Явно преобразуем BigInt в строки или числа
            const parameterId = variant.parameterId.toString();
            const mul = Number(variant.mul); // Преобразуем BigInt в число
            const add = variant.add.toString();
            console.log(parameterId, mul, add);

            let processedMul = mul;
            if (mul == 0) {
                console.log("0000000");
            } else {
                processedMul = ((mul - 10000) / 100).toFixed(2);
            }

            // Специальная обработка для add в зависимости от parameterId
            let processedAdd = add;
            switch (parameterId) {
                case "3": // Pixels per Hour - новая раскодировка
                    processedAdd = (Number(add) / 277777777777775).toFixed(2);
                    break;
                case "4": // Pixels per Hour - новая раскодировка
                    processedAdd = (Number(add) / (10**18)).toString();
                    break;
                case "5": // Pixels per Hour - новая раскодировка
                    processedAdd = (Number(add) / (10**18)).toString();
                    break;
                case "21": // Dust per Hour - нужно разделить на 10^18 и показать как десятичное число
                    processedAdd = (Number(add) / (10**18)).toString();
                    break;
                case "22": // Mission Duration - нужно разделить на 3600
                    processedAdd = Math.floor(Number(add) / 3600).toString(); // Округляем вниз
                    break;
                case "25":
                    processedAdd = ((Number(add) - 10000) / 100).toFixed(2);
                    break;
                case "26":
                    processedAdd = ((Number(add) - 10000) / 100).toFixed(0);
                    break;
                case "36": // Live time - нужно разделить на 3600
                    const time1 = Number(add) / 3600;
                    const h = Math.floor(time1);
                    const m = ((time1 - h) * 60).toFixed(0);
                    processedAdd = h + " hour " + m + " min";
                    break;
            }

            return {
                parameterId,
                mul: processedMul,
                add: processedAdd
            };
        })
    );
}

// Функция для получения данных об NFT
async function fetchNFTData(tokenId) {
    try {
        await initWeb3();
        const NFT_data = await contract.methods.getTokenType(tokenId).call();
        const collectionId = NFT_data.collectionId;
        const collectionName = collections[collectionId];

        // Получаем адрес владельца
        let ownerAddress;
        try {
            ownerAddress = await contract.methods.ownerOf(tokenId).call();
            // Проверяем, что адрес владельца не нулевой
            if (ownerAddress === '0x0000000000000000000000000000000000000000') {
                ownerAddress = null; // Устанавливаем null, если адрес нулевой
            }
        } catch (error) {
            console.error('Error fetching owner address:', error);
            ownerAddress = null; // Устанавливаем null, если произошла ошибка
        }

        // Обрабатываем variants
        const processedVariants = processVariants(NFT_data.variants);

        // Преобразуем BigInt в строку для корректного вывода
        const NFT_data_stringified = JSON.parse(JSON.stringify(NFT_data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return {
            ...NFT_data_stringified,
            variants: processedVariants,
            collectionName,
            tokenId,
            ownerAddress
        };
    } catch (error) {
        console.error('Error fetching NFT data:', error);
        if (error.message.includes('revert')) {
            throw new Error('Transaction reverted. Possible reasons: Invalid Token ID, Incorrect ABI, or Network issues.');
        }
        throw error;
    }
}

// Функция для отображения данных об NFT
function displayNFTInfo(NFT_data) {
    // Преобразуем BigInt в строку перед выводом
    const NFT_data_safe = JSON.parse(JSON.stringify(NFT_data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

    console.log('NFT_data перед отображением:', NFT_data);
    console.log('Variants:', NFT_data.variants);

    // Получаем выбранную сеть из радио-кнопок
    const network = document.querySelector('input[name="network"]:checked').value;

    // Проверяем, существует ли variants
    const variants = NFT_data_safe.variants || [];

    // Форматируем variants в нужный формат
    const formattedVariants = variants
        .map(variantArray =>
            variantArray
                .map(variant => {
                    // Заменяем parameterId на соответствующие строки
                    let parameterName;
                    switch (variant.parameterId) {
                        case "0":
                            parameterName = "<b>Drill Speed:</b>";
                            break;
                        case "1":
                            parameterName = "<b>Storage capacity:</b>";
                            break;
                        case "2":
                            parameterName = "<b>Referral storage capacity:</b>";
                            break;
                        case "3":
                            parameterName = "<b>PXLs в час:</b>";
                            break;
                        case "4":
                            parameterName = "<b>Storage fixed capacity:</b>";
                            break;
                        case "5":
                            parameterName = "<b>Referral storage fixed capacity:</b>";
                            break;
                        case "6":
                            parameterName = "<b>Drill upgrade discount:</b>";
                            break;
                        case "7":
                            parameterName = "<b>Storage upgrade discount:</b>";
                            break;
                        case "8":
                            parameterName = "<b>Referral storage upgrade discount:</b>";
                            break;
                        case "16":
                            parameterName = "<b>Second miner speed:</b>";
                            break;
                        case "17":
                            parameterName = "<b>Market commission order discount:</b>";
                            break;
                        case "20":
                            parameterName = "<b>Transaction cost markup:</b>";
                            break;
                        case "21":
                            parameterName = "<b>Dust per Hour:</b>";
                            break;
                        case "22":
                            parameterName = "<b>Mission Duration:</b>";
                            break;
                        case "23":
                            parameterName = "<b>Missions count:</b>";
                            break;
                        case "25": parameterName = "Mission Revard"; break;
                        case "26": parameterName = "Mission Duration"; break;
                        case "28": parameterName = "Live Time"; break;
                        case "33":
                            parameterName = "<b>Reduce cycle:</b>";
                            break;
                        case "34":
                            parameterName = "<b>Missions count:</b>";
                            break;
                        case "34":
                            parameterName = "<b>Missions:</b>";
                            break;
                        case "35": parameterName = "<b>Consume Xeno-Paste:</b>"; break;
                        case "36": parameterName = "<b>Live Time:</b>"; break;
                        default:
                            parameterName = `<b>${variant.parameterId}:</b>`; // Оставляем как есть, если нет замены
                    }

                    // Проверяем, нужно ли выводить значение красным цветом
                    const mulValue = parseFloat(variant.mul);
                    const mulColor = mulValue < 0 ? 'red' : 'black';

                    // Для определенных параметров не показываем 0.00%
                    let mulDisplay = '';
                    if (["4", "5", "21", "22", "23", "25", "26", "27", "28", "34", "35", "36"].includes(variant.parameterId) && parseFloat(variant.mul) === 0) {
                        // Не показываем 0.00% для этих параметров
                        mulDisplay = '';
                    } else {
                        // Показываем процент для всех остальных параметров
                        mulDisplay = `<span style="color: ${mulColor}">${variant.mul}%</span>`;
                    }

                    // Используем ОБРАБОТАННОЕ значение add
                    let addDisplay = variant.add; // Это уже обработанное значение из processVariants

                    // Добавляем единицы измерения
                    if (variant.parameterId === "21") {  // 21 - Dust per Hour
                        addDisplay = `${variant.add} пыли в час`;
                    }
                    if (variant.parameterId === "22") {  // 22 - Mission Duration
                        addDisplay = `${variant.add} часов`;
                    }
                    if (["4", "5"].includes(variant.parameterId)) {
                        addDisplay = `${variant.add} PXLs`;
                    }
                    if (["25", "26"].includes(variant.parameterId) && parseFloat(variant.add) !== 0) {
                        // Показываем процент для всех остальных параметров
                        addDisplay = `<span style="color: ${mulColor}">${variant.add}%</span>`;
                    }

                    if (variant.add == 0) { addDisplay = ``; }
                    return `
                        <div>
                            ${parameterName}
                            ${mulDisplay}
                            ${addDisplay}
                        </div>
                    `;
                })
                .join("")
        )
        .join("");

    // Формируем ссылку на историю транзакций
    let transactionLink = '';
    if (network === 'songbird') {
        transactionLink = `https://songbird-explorer.flare.network/token/0x41a7435ef2cbd77df7c6966af4e62a9b12416398/instance/${NFT_data_safe.tokenId}/token-transfers`;
    } else if (network === 'skale') {
        transactionLink = `https://elated-tan-skat.explorer.mainnet.skalenodes.com/token/0xcB48dF8e2FE472D8Be277348683bBD401Cab6201/instance/${NFT_data_safe.tokenId}`;
    }

    // Формируем информацию о владельце
    const ownerInfo = NFT_data_safe.ownerAddress
        ? `<p><b>Owner:</b> <a href="User.html?walletAddress=${NFT_data_safe.ownerAddress}&network=${network}" target="_blank">${NFT_data_safe.ownerAddress}</a></p>`
        : '<p><b>Owner:</b> Данные получить невозможно</p>';

    // Обновляем левую часть (информация об NFT)
    const tokenHtml = `
        <p>Token ID: <b>${NFT_data_safe.tokenId}</b></p>
        <p>Collection: <b>${NFT_data_safe.collectionId} "${NFT_data_safe.collectionName}"</b></p>
        <p>NFT typeId: ${NFT_data_safe.typeId}</p>
        <p>NFT name: <b>${NFT_data_safe.name}</b></p>
        <p>Token slots: ${NFT_data_safe.slots}</p>
        <p>NFT rarity: <b>${NFT_data_safe.rarity} "${rarityArray[Number(NFT_data_safe.rarity) - 1]}"</b></p>
        <p>NFT soulbound: ${NFT_data_safe.soulbound}</p>
        <p>NFT disposable: ${NFT_data_safe.disposable}</p>
        ${ownerInfo}
        <p><a href="${transactionLink}" target="_blank">View Transactions</a></p>
    `;

    document.getElementById('result').innerHTML = tokenHtml;

    // Обновляем правую часть (изображение и модификаторы)
    const nftImage = document.getElementById('nft-image');
    const nftName = document.getElementById('nft-name');

    nftName.textContent = NFT_data_safe.name;

    // Обрабатываем URL изображения
    let imageUrl = NFT_data_safe.tokenURI;

    // Проверяем, нужно ли преобразовать URL
    if (imageUrl && imageUrl.includes('gateway.dedrive.io/v1/access/')) {
        // Извлекаем хэш из URL
        const urlParts = imageUrl.split('/');
        const hash = urlParts[urlParts.length - 1];
        // Формируем новый URL
        imageUrl = `https://storage.hellopixel.network/nft/dedrive/${hash}.png`;
    }

    nftImage.src = imageUrl;
    nftImage.style.display = 'block'; // Показываем изображение

    // Устанавливаем рамку в зависимости от редкости
    const rarity = Number(NFT_data_safe.rarity);
    nftImage.className = `token-image rarity-${rarity}`;

    // Обновляем модификаторы
    document.getElementById('modifiers-list').innerHTML = formattedVariants;
}

// Функция для валидации и вызова fetchAndDisplayNFTInfo
function validateAndFetch() {
    const tokenIdInput = document.getElementById('tokenId');
    const tokenId = tokenIdInput.value.trim(); // Убираем пробелы до и после

    // Проверяем, является ли значение числом
    if (!tokenId || isNaN(tokenId)) {
        document.getElementById('result').innerHTML = '<p style="color: red;">Please enter a valid Token ID (must be a number).</p>';
        return;
    }

    // Если всё в порядке, вызываем основную функцию
    fetchAndDisplayNFTInfo();
}

// Основная функция для получения и отображения данных
async function fetchAndDisplayNFTInfo() {
    try {
        console.clear();
        const tokenIdInput = document.getElementById('tokenId');
        const tokenId = tokenIdInput.value.trim(); // Убираем пробелы до и после

        const NFT_data = await fetchNFTData(tokenId);

        // Преобразуем BigInt в строку перед логированием
        const NFT_data_safe = JSON.parse(JSON.stringify(NFT_data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        displayNFTInfo(NFT_data);

        // Логирование в консоль
        console.log('NFT Variants:', JSON.stringify(NFT_data_safe.variants, null, 2));
        console.log('Full NFT Data:', JSON.stringify(NFT_data_safe, null, 2));
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('result').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// Добавляем обработчик события на кнопку
document.addEventListener('DOMContentLoaded', function() {
    const fetchButton = document.getElementById('fetch-button');
    if (fetchButton) {
        fetchButton.addEventListener('click', validateAndFetch);
    }
});
