document.addEventListener('DOMContentLoaded', function() {
    const mapSelector = document.getElementById('mapSelector');
    const addItemBtn = document.getElementById('addItemBtn');
    const bulkEntryBtn = document.getElementById('bulkEntryBtn');
    const clearBtn = document.getElementById('clearBtn');
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    const itemList = document.getElementById('itemList');
    const mapCanvas = document.getElementById('mapCanvas');
    const bulkEntryModal = new bootstrap.Modal(document.getElementById('bulkEntryModal'));
    const submitBulkEntryBtn = document.getElementById('submitBulkEntry');

    let currentMapId = null;
    let items = [];

    // Load maps
    loadMaps();

    // Event listeners
    if (mapSelector) {
        mapSelector.addEventListener('change', handleMapChange);
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', showAddItemForm);
    }

    if (bulkEntryBtn) {
        bulkEntryBtn.addEventListener('click', function() {
            bulkEntryModal.show();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearMap);
    }

    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }

    if (searchType) {
        searchType.addEventListener('change', performSearch);
    }

    if (submitBulkEntryBtn) {
        submitBulkEntryBtn.addEventListener('click', processBulkEntry);
    }

    function loadMaps() {
        fetch('/api/maps')
            .then(response => response.json())
            .then(maps => {
                mapSelector.innerHTML = '<option value="">Select a map</option>';
                maps.forEach(map => {
                    const option = document.createElement('option');
                    option.value = map.id;
                    option.textContent = map.name;
                    mapSelector.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading maps:', error);
                displayErrorMessage('Error loading maps. Please try again later.');
            });
    }

    function handleMapChange() {
        const selectedMapId = mapSelector.value;
        if (selectedMapId) {
            currentMapId = selectedMapId;
            loadItems();
            addItemBtn.disabled = false;
        } else {
            currentMapId = null;
            clearMap();
            addItemBtn.disabled = true;
        }
    }

    function loadItems() {
        if (!currentMapId) return;
        console.log('Loading items for map ID:', currentMapId);
        fetch(`/api/items?map_id=${currentMapId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log('Response received from server');
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

    function updateItemList() {
        itemList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span class="item-name">${item.name}</span>
                <div>
                    <span class="badge bg-primary rounded-pill">${item.quantity}</span>
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="editItem(${item.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteItem(${item.id})">Delete</button>
                </div>
            `;
            itemList.appendChild(li);
        });
    }

    function drawMap() {
        // Implement map drawing logic here
        console.log('Drawing map');
    }

    function showAddItemForm() {
        // Implement add item form logic here
        console.log('Showing add item form');
    }

    function clearMap() {
        items = [];
        updateItemList();
        drawMap();
    }

    function performSearch() {
        const query = searchInput.value;
        const type = searchType.value;
        if (!currentMapId) return;

        fetch(`/api/search?q=${query}&type=${type}&map_id=${currentMapId}`)
            .then(response => response.json())
            .then(data => {
                items = data;
                updateItemList();
                drawMap();
            })
            .catch(error => {
                console.error('Error searching items:', error);
                displayErrorMessage('Error searching items. Please try again later.');
            });
    }

    function processBulkEntry() {
        const bulkEntryData = document.getElementById('bulkEntryData').value;
        const rows = bulkEntryData.split('\n');
        const items = rows.map(row => {
            const [name, tags, x_coord, y_coord, color, zone, quantity, warning, description, link] = row.split(',');
            return {
                name: name.trim(),
                tags: tags.trim(),
                x_coord: parseFloat(x_coord),
                y_coord: parseFloat(y_coord),
                color: color.trim(),
                zone: zone.trim(),
                quantity: parseInt(quantity),
                warning: warning.trim(),
                description: description.trim(),
                link: link.trim(),
                map_id: currentMapId
            };
        });

        submitBulkEntryBtn.disabled = true;
        submitBulkEntryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        Promise.all(items.map(item => 
            fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
        ))
        .then(() => {
            bulkEntryModal.hide();
            loadItems();
            displaySuccessMessage('Bulk entry processed successfully');
        })
        .catch(error => {
            console.error('Error processing bulk entry:', error);
            displayErrorMessage('Error processing bulk entry. Please check your data and try again.');
        })
        .finally(() => {
            submitBulkEntryBtn.disabled = false;
            submitBulkEntryBtn.textContent = 'Submit';
            document.getElementById('bulkEntryData').value = '';
        });
    }

    function displaySuccessMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show notification';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    function displayErrorMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show notification';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Expose functions to global scope for onclick handlers
    window.editItem = function(itemId) {
        console.log('Editing item:', itemId);
        // Implement edit item logic here
    };

    window.deleteItem = function(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            fetch(`/api/items/${itemId}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(() => {
                    loadItems();
                    displaySuccessMessage('Item deleted successfully');
                })
                .catch(error => {
                    console.error('Error deleting item:', error);
                    displayErrorMessage('Error deleting item. Please try again later.');
                });
        }
    };
});
