document.addEventListener('DOMContentLoaded', function() {
    const mapCanvas = document.getElementById('mapCanvas');
    const ctx = mapCanvas.getContext('2d');
    const itemList = document.getElementById('itemList');
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    const addItemBtn = document.getElementById('addItemBtn');
    const clearBtn = document.getElementById('clearBtn');
    const addItemForm = document.getElementById('addItemForm');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const itemNameInput = document.getElementById('itemName');
    const itemTagsInput = document.getElementById('itemTags');
    const itemImageInput = document.getElementById('itemImage');
    const mapSelector = document.getElementById('mapSelector');
    const dropArea = document.getElementById('dropArea');
    const updateItemBtn = document.getElementById('updateItemBtn');

    const bulkAddBtn = document.getElementById('bulkAddBtn');
    const bulkEntryModal = new bootstrap.Modal(document.getElementById('bulkEntryModal'));
    const saveBulkEntryBtn = document.getElementById('saveBulkEntryBtn');

    let items = [];
    let mapImage = new Image();
    let selectedLocation = null;
    let scale = 1;
    let currentMapId = null;

    function resizeCanvas() {
        if (mapCanvas && mapImage.complete && mapImage.naturalHeight !== 0) {
            const container = mapCanvas.parentElement;
            const containerWidth = container.clientWidth;
            mapCanvas.width = containerWidth;
            mapCanvas.height = (mapImage.height / mapImage.width) * containerWidth;
            scale = containerWidth / mapImage.width;
            drawMap();
        }
    }

    function drawMap() {
        if (ctx && mapImage.complete && mapImage.naturalHeight !== 0) {
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
            ctx.drawImage(mapImage, 0, 0, mapCanvas.width, mapCanvas.height);
            items.forEach(item => {
                ctx.fillStyle = item.color || 'red';
                ctx.beginPath();
                ctx.arc(item.x_coord * scale, item.y_coord * scale, 5, 0, 2 * Math.PI);
                ctx.fill();
            });
            if (selectedLocation) {
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(selectedLocation.x, selectedLocation.y, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    function loadMaps() {
        fetch('/api/maps')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                mapSelector.innerHTML = '<option value="">Select a map</option>';
                data.forEach(map => {
                    const option = document.createElement('option');
                    option.value = map.id;
                    option.textContent = map.name;
                    mapSelector.appendChild(option);
                });
                
                const iLabOption = Array.from(mapSelector.options).find(option => option.text === 'iLab');
                if (iLabOption) {
                    mapSelector.value = iLabOption.value;
                    mapSelector.dispatchEvent(new Event('change'));
                }
            })
            .catch(error => {
                console.error('Error loading maps:', error);
                displayErrorMessage('Error loading maps. Please try again later.');
            });
    }

    function loadItems() {
        console.log('loadItems called with currentMapId:', currentMapId);
        if (!currentMapId) return;
        fetch(`/api/items?map_id=${currentMapId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Items loaded:', data);
                items = data;
                updateItemList();
                drawMap();
            })
            .catch(error => {
                console.error('Error loading items:', error);
                displayErrorMessage('Error loading items. Please try again later.');
            });
    }

    if (mapSelector) {
        mapSelector.addEventListener('change', function() {
            currentMapId = this.value;
            console.log('Map selected, currentMapId:', currentMapId);
            if (currentMapId) {
                fetch(`/api/maps/${currentMapId}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Map data loaded:', data);
                        mapImage.src = data.svg_path;
                        mapImage.onload = function() {
                            resizeCanvas();
                            loadItems();
                        };
                        if (mapCanvas) {
                            mapCanvas.style.backgroundColor = data.background_color;
                        }
                    })
                    .catch(error => {
                        console.error('Error loading map:', error);
                        displayErrorMessage('Error loading map. Please try again later.');
                    });
            } else {
                if (ctx) {
                    ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
                }
                items = [];
                updateItemList();
            }
        });
    }

    loadMaps();

    if (bulkAddBtn) {
        bulkAddBtn.addEventListener('click', function() {
            bulkEntryModal.show();
        });
    }

    if (saveBulkEntryBtn) {
        saveBulkEntryBtn.addEventListener('click', function() {
            const bulkEntryText = document.getElementById('bulkEntryText').value;
            const items = parseBulkEntryText(bulkEntryText);
            if (items.length > 0) {
                saveBulkItems(items);
            } else {
                displayErrorMessage('No valid items found in the bulk entry text.');
            }
        });
    }

    function parseBulkEntryText(text) {
        const lines = text.split('\n');
        return lines.map(line => {
            const [name, tags, quantity, description, link] = line.split(',').map(item => item.trim());
            if (name) {
                return { name, tags, quantity: parseInt(quantity) || 1, description, link };
            }
            return null;
        }).filter(item => item !== null);
    }

    function saveBulkItems(items) {
        if (!currentMapId) {
            displayErrorMessage('Please select a map before adding items.');
            return;
        }

        const saveButton = document.getElementById('saveBulkEntryBtn');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

        fetch('/api/bulk_items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                map_id: currentMapId,
                items: items
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            bulkEntryModal.hide();
            loadItems();
            displaySuccessMessage(`Successfully added ${data.added_count} items.`);
            document.getElementById('bulkEntryText').value = '';
        })
        .catch(error => {
            console.error('Error adding bulk items:', error);
            displayErrorMessage('Error adding bulk items. Please try again later.');
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Items';
        });
    }

    function updateItemList() {
        console.log('updateItemList called with items:', items);
        itemList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span class="item-name">${item.name}</span>
                <div class="tag-container">
                    ${item.tags.split(',').map(tag => `<span class="item-tag">${tag.trim()}</span>`).join('')}
                </div>
            `;
            itemList.appendChild(li);
        });
    }

    function displayErrorMessage(message) {
        console.error('Error:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }

    function displaySuccessMessage(message) {
        console.log('Success:', message);
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.insertBefore(successDiv, document.body.firstChild);
    }

    // Add event listener for window resize
    window.addEventListener('resize', resizeCanvas);
});
