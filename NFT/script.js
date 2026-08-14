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
            const parameterId = variant.parameterId.toString();
            const mul = Number(variant.mul);
            const add = variant.add.toString();

            let processedMul = mul;
            if (mul == 0) {
                console.log("0000000");
            } else {
                processedMul = ((mul - 10000) / 100).toFixed(2);
            }

            let processedAdd = add;
            switch (parameterId) {
                case "3":
                    processedAdd = (Number(add) / 277777777777775).toFixed(2);
                    break;
                case "4":
                    processedAdd = (Number(add) / (10**18)).toString();
                    break;
                case "5":
                    processedAdd = (Number(add) / (10**18)).toString();
                    break;
                case "21":
                    processedAdd = (Number(add) / (10**18)).toString();
                    break;
                case "22":
                    processedAdd = Math.floor(Number(add) / 3600).toString();
                    break;
                case "25":
                    processedAdd = ((Number(add) - 10000) / 100).toFixed(2);
                    break;
                case "26":
                    processedAdd = ((Number(add) - 10000) / 100).toFixed(0);
                    break;
                case "36":
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

        let ownerAddress;
        try {
            ownerAddress = await contract.methods.ownerOf(tokenId).call();
            if (ownerAddress === '0x0000000000000000000000000000000000000000') {
                ownerAddress = null;
            }
        } catch (error) {
            console.error('Error fetching owner address:', error);
            ownerAddress = null;
        }

        const processedVariants = processVariants(NFT_data.variants);

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
    const NFT_data_safe = JSON.parse(JSON.stringify(NFT_data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

    console.log('NFT_data перед отображением:', NFT_data);
    console.log('Variants:', NFT_data.variants);

    const network = document.querySelector('input[name="network"]:checked').value;
    const variants = NFT_data_safe.variants || [];

    const formattedVariants = variants
        .map(variantArray =>
            variantArray
                .map(variant => {
                    let parameterName;
                    switch (variant.parameterId) {
                        case "0": parameterName = "Drill Speed"; break;
                        case "1": parameterName = "Storage capacity"; break;
                        case "2": parameterName = "Referral storage capacity"; break;
                        case "3": parameterName = "PXLs в час"; break;
                        case "4": parameterName = "Storage fixed capacity"; break;
                        case "5": parameterName = "Referral storage fixed capacity"; break;
                        case "6": parameterName = "Drill upgrade discount"; break;
                        case "7": parameterName = "Storage upgrade discount"; break;
                        case "8": parameterName = "Referral storage upgrade discount"; break;
                        case "16": parameterName = "Second miner speed"; break;
                        case "17": parameterName = "Market commission order discount"; break;
                        case "20": parameterName = "Transaction cost markup"; break;
                        case "21": parameterName = "Dust per Hour"; break;
                        case "22": parameterName = "Mission Duration"; break;
                        case "23": parameterName = "Missions count"; break;
                        case "25": parameterName = "Mission Revard"; break;
                        case "26": parameterName = "Mission Duration"; break;
                        case "28": parameterName = "Live Time"; break;
                        case "33": parameterName = "Reduce cycle"; break;
                        case "34": parameterName = "Missions count"; break;
                        case "35": parameterName = "Consume Xeno-Paste"; break;
                        case "36": parameterName = "Live Time"; break;
                        default: parameterName = `${variant.parameterId}`;
                    }

                    // Формируем значение модификатора
                    let valueDisplay = '';
                    
                    // Проверяем mul (процентное значение)
                    const mulValue = parseFloat(variant.mul);
                    if (mulValue !== 0 && !isNaN(mulValue)) {
                        const color = mulValue > 0 ? 'rgb(7, 170, 52)' : 'rgb(230, 32, 88)';
                        valueDisplay += `<span style="color: ${color}">${variant.mul}%</span>`;
                    }

                    // Проверяем add (дополнительное значение)
                    if (variant.add && variant.add !== '0' && variant.add !== '') {
                        // Для некоторых параметров add может быть числом
                        const addValue = parseFloat(variant.add);
                        if (!isNaN(addValue) && addValue !== 0) {
                            const color = addValue > 0 ? 'rgb(7, 170, 52)' : 'rgb(230, 32, 88)';
                            
                            // Добавляем единицы измерения
                            let addText = variant.add;
                            if (variant.parameterId === "21") {
                                addText = `${variant.add} пыли в час`;
                            } else if (variant.parameterId === "22") {
                                addText = `${variant.add} часов`;
                            } else if (["4", "5"].includes(variant.parameterId)) {
                                addText = `${variant.add} PXLs`;
                            }
                            
                            // Если есть mul, добавляем пробел перед add
                            if (valueDisplay) {
                                valueDisplay += ' ';
                            }
                            valueDisplay += `<span style="color: ${color}">${addText}</span>`;
                        }
                    }

                    // Если нет ни mul, ни add, показываем что-то по умолчанию
                    if (!valueDisplay) {
                        valueDisplay = '<span style="color: rgb(126, 161, 202)">—</span>';
                    }

                    return `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(126, 161, 202, 0.08);">
                            <span style="color: rgb(126, 161, 202);">${parameterName}</span>
                            <span>${valueDisplay}</span>
                        </div>
                    `;
                })
                .join("")
        )
        .join("");

    let transactionLink = '';
    if (network === 'songbird') {
        transactionLink = `https://songbird-explorer.flare.network/token/0x41a7435ef2cbd77df7c6966af4e62a9b12416398/instance/${NFT_data_safe.tokenId}/token-transfers`;
    } else if (network === 'skale') {
        transactionLink = `https://elated-tan-skat.explorer.mainnet.skalenodes.com/token/0xcB48dF8e2FE472D8Be277348683bBD401Cab6201/instance/${NFT_data_safe.tokenId}`;
    }

    const ownerInfo = NFT_data_safe.ownerAddress
        ? `<p><b>Owner:</b> <a href="User.html?walletAddress=${NFT_data_safe.ownerAddress}&network=${network}" target="_blank">${NFT_data_safe.ownerAddress}</a></p>`
        : '<p><b>Owner:</b> Данные получить невозможно</p>';

    // Обновляем левую часть
    const tokenHtml = `
        <p>Token ID: <b>${NFT_data_safe.tokenId}</b></p>
        <p>Collection: <b>${NFT_data_safe.collectionId} "${NFT_data_safe.collectionName}"</b></p>
        <p>NFT typeId: ${NFT_data_safe.typeId}</p>
        <p>Token slots: ${NFT_data_safe.slots}</p>
        <p>NFT rarity: <b>${NFT_data_safe.rarity} "${rarityArray[Number(NFT_data_safe.rarity) - 1]}"</b></p>
        <p>NFT soulbound: ${NFT_data_safe.soulbound}</p>
        <p>NFT disposable: ${NFT_data_safe.disposable}</p>
        ${ownerInfo}
        <p><a href="${transactionLink}" target="_blank">View Transactions</a></p>
    `;

    document.getElementById('result').innerHTML = tokenHtml;

    // Обновляем правую часть
    const nftImage = document.getElementById('nft-image');
    const nftName = document.getElementById('nft-name');
    const nftCollection = document.getElementById('nft-collection');
    const nftRarity = document.getElementById('nft-rarity');

    nftName.textContent = NFT_data_safe.name;
    nftCollection.textContent = NFT_data_safe.collectionName || 'Unknown Collection';

    // Редкость с цветом
    const rarityIndex = Number(NFT_data_safe.rarity) - 1;
    const rarityText = rarityArray[rarityIndex] || 'Unknown';
    const rarityColors = ['#ffffff', '#00ff66', '#00a2ff', '#cc00ff', '#ff7700'];
    nftRarity.textContent = rarityText;
    nftRarity.style.color = rarityColors[rarityIndex] || '#ffffff';

    let imageUrl = NFT_data_safe.tokenURI;
    if (imageUrl && imageUrl.includes('gateway.dedrive.io/v1/access/')) {
        const urlParts = imageUrl.split('/');
        const hash = urlParts[urlParts.length - 1];
        imageUrl = `https://storage.hellopixel.network/nft/dedrive/${hash}.png`;
    }

    nftImage.src = imageUrl;
    nftImage.style.display = 'block';

    const rarity = Number(NFT_data_safe.rarity);
    nftImage.className = `token-image rarity-${rarity}`;

    document.getElementById('modifiers-list').innerHTML = formattedVariants;
}

// Функция для валидации и вызова fetchAndDisplayNFTInfo
function validateAndFetch() {
    const tokenIdInput = document.getElementById('tokenId');
    const tokenId = tokenIdInput.value.trim();

    if (!tokenId || isNaN(tokenId)) {
        document.getElementById('result').innerHTML = '<p style="color: red;">Please enter a valid Token ID (must be a number).</p>';
        return;
    }

    fetchAndDisplayNFTInfo();
}

// Основная функция для получения и отображения данных
async function fetchAndDisplayNFTInfo() {
    try {
        console.clear();
        const tokenIdInput = document.getElementById('tokenId');
        const tokenId = tokenIdInput.value.trim();

        const NFT_data = await fetchNFTData(tokenId);

        const NFT_data_safe = JSON.parse(JSON.stringify(NFT_data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        displayNFTInfo(NFT_data);

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