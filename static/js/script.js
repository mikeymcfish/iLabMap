console.log('script.js loaded');

let currentMapId = null;
let scale = 1;
const mapCanvas = document.getElementById('mapCanvas');
const itemList = document.getElementById('itemList');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    initializeMapSelector();
});

function initializeMapSelector() {
    console.log('Initializing map selector');
    const mapSelector = document.getElementById('mapSelector');
    fetch('/api/maps')
        .then(response => response.json())
        .then(maps => {
            console.log('Received maps from server:', maps);
            maps.forEach(map => {
                const option = document.createElement('option');
                option.value = map.id;
                option.textContent = map.name;
                mapSelector.appendChild(option);
            });
            console.log('Map options added to selector');
            mapSelector.addEventListener('change', (event) => {
                currentMapId = event.target.value;
                console.log(`Map selected: ${currentMapId}`);
                if (currentMapId) {
                    loadItems();
                }
            });
        })
        .catch(error => {
            console.error('Error loading maps:', error);
            displayErrorMessage('Error loading maps. Please try again later.');
        });
}

function loadItems() {
    if (!currentMapId) {
        console.error('No map selected');
        return;
    }

    console.log(`Fetching items for map ID: ${currentMapId}`);
    fetch(`/api/items?map_id=${currentMapId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(items => {
            console.log('Received items from server:', items);
            if (!Array.isArray(items)) {
                throw new Error('Server response is not an array');
            }
            clearItems();
            items.forEach(item => {
                console.log('Processing item:', item);
                if (!item.id || !item.name || item.x_coord === undefined || item.y_coord === undefined || item.z_coord === undefined) {
                    console.error('Invalid item data:', item);
                    return;
                }
                addItemToMap(item);
                addItemToList(item);
            });
        })
        .catch(error => {
            console.error('Error loading items:', error);
            displayErrorMessage('Error loading items. Please try again later.');
        });
}

function addItemToMap(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item';
    itemElement.style.left = `${item.x_coord * scale}px`;
    itemElement.style.top = `${item.y_coord * scale}px`;
    itemElement.style.zIndex = Math.floor(item.z_coord * 100);
    itemElement.style.backgroundColor = item.color || 'red';
    itemElement.title = item.name;
    itemElement.dataset.itemId = item.id;
    itemElement.addEventListener('click', () => showItemDetails(item));
    mapCanvas.appendChild(itemElement);
    console.log('Added item to map:', itemElement);
}

function addItemToList(item) {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    listItem.innerHTML = `
        <span class="item-name">${item.name}</span>
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-sm btn-outline-primary edit-btn">Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
        </div>
    `;
    listItem.querySelector('.edit-btn').addEventListener('click', () => editItem(item));
    listItem.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));
    itemList.appendChild(listItem);
    console.log('Added item to list:', listItem);
}

function clearItems() {
    console.log('Clearing items from map and list');
    mapCanvas.innerHTML = '';
    itemList.innerHTML = '';
}

function showItemDetails(item) {
    console.log('Showing item details:', item);
}

function editItem(item) {
    console.log('Editing item:', item);
}

function deleteItem(itemId) {
    console.log('Deleting item:', itemId);
}

function displayErrorMessage(message) {
    console.error(message);
}
