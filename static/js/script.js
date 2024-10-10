document.addEventListener('DOMContentLoaded', function() {
    const mapCanvas = document.getElementById('mapCanvas');
    const ctx = mapCanvas ? mapCanvas.getContext('2d') : null;
    const mapSelector = document.getElementById('mapSelector');
    const itemList = document.getElementById('itemList');
    const addItemBtn = document.getElementById('addItemBtn');
    const clearBtn = document.getElementById('clearBtn');
    const addItemForm = document.getElementById('addItemForm');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const itemNameInput = document.getElementById('itemName');
    const itemTagsInput = document.getElementById('itemTags');
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');

    let currentMapId = null;
    let items = [];
    let selectedLocation = null;
    let mapImage = new Image();
    let scale = 1;

    function resizeCanvas() {
        if (mapCanvas && mapImage) {
            mapCanvas.width = mapImage.width;
            mapCanvas.height = mapImage.height;
            scale = mapCanvas.offsetWidth / mapImage.width;
            drawMap();
        }
    }

    function drawMap() {
        if (ctx && mapImage) {
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
            ctx.drawImage(mapImage, 0, 0);
            items.forEach(item => drawItem(item));
            if (selectedLocation) {
                drawSelectedLocation();
            }
        }
    }

    function drawItem(item) {
        if (ctx) {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(item.x_coord, item.y_coord, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    function drawSelectedLocation() {
        if (ctx && selectedLocation) {
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(selectedLocation.x, selectedLocation.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
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

    function loadItems() {
        if (currentMapId) {
            fetch(`/api/items?map_id=${currentMapId}`)
                .then(response => response.json())
                .then(data => {
                    items = data;
                    drawMap();
                    updateItemList();
                })
                .catch(error => {
                    console.error('Error loading items:', error);
                    displayErrorMessage('Error loading items. Please try again later.');
                });
        } else {
            items = [];
            updateItemList();
        }
    }

    function updateItemList() {
        if (itemList) {
            itemList.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('a');
                li.classList.add('list-group-item', 'list-group-item-action', 'd-flex', 'justify-content-between', 'align-items-center');
                li.innerHTML = `
                    <div>
                        <h5 class="mb-1">${item.name}</h5>
                        <div class="tag-container">
                            ${item.tags.split(',').map(tag => `<span class="item-tag">${tag.trim()}</span>`).join('')}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm delete-item" data-id="${item.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                li.addEventListener('mouseover', () => highlightItem(item));
                li.addEventListener('mouseout', drawMap);
                itemList.appendChild(li);
            });

            document.querySelectorAll('.delete-item').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const itemId = button.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this item?')) {
                        deleteItem(itemId);
                    }
                });
            });
        }
    }

    function deleteItem(itemId) {
        fetch(`/api/items/${itemId}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(() => {
            loadItems();
        })
        .catch(error => {
            console.error('Error deleting item:', error);
            displayErrorMessage('Error deleting item. Please try again later.');
        });
    }

    function highlightItem(item) {
        if (ctx) {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(item.x_coord, item.y_coord, 8, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    function displayErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('alert', 'alert-danger', 'mt-3');
        errorDiv.textContent = message;
        document.body.insertBefore(errorDiv, document.body.firstChild);
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    window.addEventListener('resize', resizeCanvas);

    if (mapCanvas) {
        mapCanvas.addEventListener('click', function(event) {
            const rect = mapCanvas.getBoundingClientRect();
            const scaleX = mapCanvas.width / rect.width;
            const scaleY = mapCanvas.height / rect.height;
            selectedLocation = {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY
            };
            drawMap();
            if (addItemBtn) {
                addItemBtn.disabled = false;
            }
        });
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            console.log('Add Item button clicked');
            console.log('Selected Location:', selectedLocation);
            console.log('Current Map ID:', currentMapId);
            if (selectedLocation && addItemForm) {
                addItemForm.style.display = 'block';
                addItemForm.style.left = `${selectedLocation.x / scale}px`;
                addItemForm.style.top = `${selectedLocation.y / scale}px`;
            } else {
                console.log('Error: selectedLocation or addItemForm is null');
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            selectedLocation = null;
            if (addItemBtn) {
                addItemBtn.disabled = true;
            }
            if (addItemForm) {
                addItemForm.style.display = 'none';
            }
            drawMap();
        });
    }

    if (saveItemBtn) {
        saveItemBtn.addEventListener('click', function() {
            console.log('Save Item button clicked');
            console.log('Selected Location:', selectedLocation);
            console.log('Current Map ID:', currentMapId);

            if (!selectedLocation || !currentMapId) {
                displayErrorMessage('Please select a location on the map and ensure a map is selected.');
                return;
            }

            const newItem = {
                name: itemNameInput.value,
                tags: itemTagsInput.value,
                x_coord: selectedLocation.x / scale,
                y_coord: selectedLocation.y / scale,
                map_id: currentMapId
            };

            console.log('New Item:', newItem);

            fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newItem),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Item added successfully:', data);
                if (addItemForm) {
                    addItemForm.style.display = 'none';
                }
                loadItems();
                if (itemNameInput) {
                    itemNameInput.value = '';
                }
                if (itemTagsInput) {
                    itemTagsInput.value = '';
                }
                selectedLocation = null;
                if (addItemBtn) {
                    addItemBtn.disabled = true;
                }
            })
            .catch(error => {
                console.error('Error adding item:', error);
                displayErrorMessage('Error adding item. Please try again later.');
            });
        });
    }

    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', function() {
            if (addItemForm) {
                addItemForm.style.display = 'none';
            }
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
                        mapImage.src = data.svg_path;
                        mapImage.onload = function() {
                            resizeCanvas();
                            loadItems();
                        };
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

    // Implement advanced search
    if (searchInput && searchType) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const type = searchType.value;
            
            if (currentMapId) {
                fetch(`/api/search?q=${query}&type=${type}&map_id=${currentMapId}`)
                    .then(response => response.json())
                    .then(data => {
                        items = data;
                        drawMap();
                        updateItemList();
                    })
                    .catch(error => {
                        console.error('Error searching items:', error);
                        displayErrorMessage('Error searching items. Please try again later.');
                    });
            }
        });

        searchType.addEventListener('change', function() {
            searchInput.dispatchEvent(new Event('input'));
        });
    }

    loadMaps();
});
