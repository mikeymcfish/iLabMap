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
    const mapSelector = document.getElementById('mapSelector');

    let items = [];
    let mapImage = new Image();
    let selectedLocation = null;
    let scale = 1;
    let currentMapId = null;

    mapImage.onload = function() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        drawMap();
    };

    mapImage.onerror = function() {
        console.error('Failed to load map image');
        displayErrorMessage('Failed to load map image. Please try again later.');
    };

    function displayErrorMessage(message) {
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(message, mapCanvas.width / 2, mapCanvas.height / 2);
        } else {
            console.error('Canvas context not available');
        }
        alert(message);
    }

    function resizeCanvas() {
        if (mapCanvas) {
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
                ctx.fillStyle = 'red';
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
        } else {
            console.error('Unable to draw map: Canvas context or image not ready');
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
                
                // Set iLab map as default
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

    function updateItemList() {
        items.sort((a, b) => a.name.localeCompare(b.name));
        itemList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('a');
            li.classList.add('list-group-item', 'list-group-item-action');
            li.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <h5 class="mb-0">${item.name}</h5>
                    <div class="tag-container">
                        ${item.tags.split(',').map(tag => `<span class="item-tag">${tag.trim()}</span>`).join('')}
                    </div>
                </div>
            `;
            li.addEventListener('mouseover', () => highlightItem(item));
            li.addEventListener('mouseout', drawMap);
            itemList.appendChild(li);
        });
    }

    function highlightItem(item) {
        drawMap();
        if (ctx) {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(item.x_coord * scale, item.y_coord * scale, 8, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    function performSearch() {
        const query = searchInput.value.toLowerCase();
        const type = searchType.value;
        fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}&map_id=${currentMapId}`)
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
                console.error('Error searching items:', error);
                displayErrorMessage('Error searching items. Please try again later.');
            });
    }

    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }

    if (searchType) {
        searchType.addEventListener('change', performSearch);
    }

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
            if (selectedLocation && addItemForm) {
                if (addItemForm.style.display === 'none' || addItemForm.style.display === '') {
                    positionAddItemForm();
                    addItemForm.style.display = 'block';
                } else {
                    addItemForm.style.display = 'none';
                }
            }
        });
    }

    function positionAddItemForm() {
        if (!addItemForm || !selectedLocation) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const formWidth = 300;
        const formHeight = 250;

        // Get the canvas position and dimensions
        const canvasRect = mapCanvas.getBoundingClientRect();

        // Calculate the position relative to the canvas
        let left = (selectedLocation.x / scale) + canvasRect.left;
        let top = (selectedLocation.y / scale) + canvasRect.top;

        // Adjust horizontal position if it goes off-screen
        if (left + formWidth > viewportWidth) {
            left = viewportWidth - formWidth - 20;
        }
        if (left < 0) {
            left = 20;
        }

        // Adjust vertical position if it goes off-screen
        if (top + formHeight > viewportHeight) {
            top = viewportHeight - formHeight - 20;
        }
        if (top < 0) {
            top = 20;
        }

        // Apply the new position
        addItemForm.style.position = 'fixed';
        addItemForm.style.left = `${left}px`;
        addItemForm.style.top = `${top}px`;

        // Log positioning information for debugging
        console.log('Form positioning:', {
            viewportWidth,
            viewportHeight,
            canvasRect,
            selectedLocation,
            formPosition: { left, top }
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

    // Add event listener for window resize
    window.addEventListener('resize', function() {
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    // Add event listener for window scroll
    window.addEventListener('scroll', function() {
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    loadMaps();
});
