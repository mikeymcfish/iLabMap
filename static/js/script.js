document.addEventListener('DOMContentLoaded', function() {
    const mapCanvas = document.getElementById('mapCanvas');
    const ctx = mapCanvas ? mapCanvas.getContext('2d') : null;
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

    function submitOnEnter(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (saveItemBtn) saveItemBtn.click();
        }
    }
    
    if (itemTagsInput) {
        itemTagsInput.addEventListener('keydown', submitOnEnter);
    }

    function resizeCanvas() {
        if (mapCanvas && ctx) {
            const container = mapCanvas.parentElement;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            const imageAspectRatio = mapImage.width / mapImage.height;
            const containerAspectRatio = containerWidth / containerHeight;
            
            let newWidth, newHeight;
            
            if (containerAspectRatio > imageAspectRatio) {
                newHeight = containerHeight;
                newWidth = newHeight * imageAspectRatio;
            } else {
                newWidth = containerWidth;
                newHeight = newWidth / imageAspectRatio;
            }
            
            mapCanvas.width = newWidth;
            mapCanvas.height = newHeight;
            
            mapCanvas.style.position = 'absolute';
            mapCanvas.style.left = `${(containerWidth - newWidth) / 2}px`;
            mapCanvas.style.top = `${(containerHeight - newHeight) / 2}px`;
            
            scale = newWidth / mapImage.width;
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
                if (mapSelector) {
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
                }
            })
            .catch(error => {
                console.error('Error loading maps:', error);
                displayErrorMessage('Error loading maps. Please try again later.');
            });
    }

    // ... [rest of the functions remain unchanged]

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
            
            if (addItemForm && addItemForm.style.display === 'block') {
                if (updateItemBtn && updateItemBtn.textContent === 'Update Item') {
                    const itemId = updateItemBtn.getAttribute('data-item-id');
                    const item = items.find(item => item.id === parseInt(itemId));
                    if (item) {
                        item.x_coord = selectedLocation.x / scale;
                        item.y_coord = selectedLocation.y / scale;
                        displaySuccessMessage('Item location updated. Click "Update Item" to save changes.');
                    }
                } else {
                    positionAddItemForm();
                }
            }
        });
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            if (selectedLocation) {
                if (addItemForm && (addItemForm.style.display === 'none' || addItemForm.style.display === '')) {
                    resetForm();
                    positionAddItemForm();
                    addItemForm.style.display = 'block';
                } else if (addItemForm) {
                    addItemForm.style.display = 'none';
                }
            } else {
                displayErrorMessage('Please select a location on the map first.');
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

    if (updateItemBtn) {
        updateItemBtn.addEventListener('click', function() {
            if (this.textContent === 'Update Item') {
                const itemId = this.getAttribute('data-item-id');
                const item = items.find(item => item.id === parseInt(itemId));
                if (item) {
                    updateItem(item);
                }
            } else {
                saveItem();
            }
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

    window.addEventListener('resize', function() {
        resizeCanvas();
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    window.addEventListener('scroll', function() {
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    if (itemImageInput) {
        itemImageInput.addEventListener('change', function(e) {
            console.log('File input changed');
            if (this.files[0]) {
                updateDropAreaUI(this.files[0]);
                
                if (updateItemBtn && updateItemBtn.textContent === 'Update Item') {
                    const itemId = updateItemBtn.getAttribute('data-item-id');
                    updateItemImage(itemId, this.files[0]);
                }
            }
        });
    }

    initializeDropArea();
    loadMaps();
});

// Keep function declarations outside the DOMContentLoaded event listener
function displayErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show notification';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function displaySuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show notification';
    successDiv.role = 'alert';
    successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// ... [other function declarations remain unchanged]
