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
        if (!currentMapId) return;
        fetch(`/api/items?map_id=${currentMapId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
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
            if (currentMapId) {
                fetch(`/api/maps/${currentMapId}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
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
});