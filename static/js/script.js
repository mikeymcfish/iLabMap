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
            saveItemBtn.click();
        }
    }
    
    if (itemTagsInput) {
        itemTagsInput.addEventListener('keydown', submitOnEnter);
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
            const li = document.createElement('div');
            li.classList.add('list-group-item', 'd-flex', 'flex-column');

            const mainContent = document.createElement('div');
            mainContent.classList.add('d-flex', 'align-items-center', 'justify-content-between');

            const imageNameContainer = document.createElement('div');
            imageNameContainer.classList.add('d-flex', 'align-items-center', 'flex-grow-1');
            mainContent.style.width = '100%';
            
            const imageElement = document.createElement('img');
            imageElement.src = item.image_path;
            imageElement.width = 75;
            imageElement.height = 75;
            imageElement.alt = item.name;
            imageElement.style.marginRight = '10px';

            const infoElement = document.createElement('div');
            infoElement.classList.add('d-flex', 'flex-column', 'info-box', 'flex-grow-1');

            const tagContainer = document.createElement('div');
            tagContainer.classList.add('tag-container', 'mt-2');
            tagContainer.innerHTML = item.tags.split(',')
                .map(tag => `<span class="item-tag">${tag.trim()}</span>`)
                .join('');
            
            const nameElement = document.createElement('div');
            nameElement.classList.add('mb-1', 'flex-grow-1', 'item-name');
            if (item.quantity !== null && item.quantity !== 1) {
                nameElement.textContent = item.name + " (" + item.quantity + ")";
            } else {
                nameElement.textContent = item.name;
            }
            
            imageNameContainer.appendChild(imageElement);
            infoElement.appendChild(nameElement);
            infoElement.appendChild(tagContainer);
            imageNameContainer.appendChild(infoElement);

            if (item.warning) {
                const warnings = item.warning.split(',').filter(warning => warning.trim() !== "");
                warnings.forEach(warning => {
                    const warningBadge = document.createElement('div');
                    warningBadge.classList.add('warning-badges');
                    const warningIcon = document.createElement('i');
                    warningIcon.classList.add('fas', 'fa-md', `fa-${warning.trim()}`);
                    warningBadge.appendChild(warningIcon);
                    imageNameContainer.appendChild(warningBadge);
                });
            }

            const buttons = document.createElement('div');

            const editButton = document.createElement('button');
            editButton.classList.add('btn', 'btn-secondary', 'btn-sm', 'edit-item', 'me-2');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.setAttribute('data-item-id', item.id);
            
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('btn', 'btn-danger', 'btn-sm', 'delete-item');
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.setAttribute('data-item-id', item.id);

            mainContent.appendChild(imageNameContainer);
            buttons.appendChild(editButton);
            buttons.appendChild(deleteButton);
            mainContent.appendChild(buttons);

            li.appendChild(mainContent);

            li.addEventListener('mouseover', () => highlightItem(item));
            li.addEventListener('mouseout', drawMap);

            itemList.appendChild(li);
        });

        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const itemId = this.getAttribute('data-item-id');
                deleteItem(itemId);
            });
        });

        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const itemId = this.getAttribute('data-item-id');
                editItem(itemId);
            });
        });
    }

    function deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            fetch(`/api/items/${itemId}`, {
                method: 'DELETE',
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Item not found. It may have been already deleted.');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                loadItems();
                displaySuccessMessage(data.message || 'Item deleted successfully');
            })
            .catch(error => {
                console.error('Error deleting item:', error);
                displayErrorMessage(`Error deleting item: ${error.message}`);
            });
        }
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

    function positionAddItemForm() {
        if (!addItemForm || !selectedLocation) return;

        const addButton = document.getElementById('addItemBtn');
        const addButtonRect = addButton.getBoundingClientRect();

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const formWidth = 300;
        const formHeight = 250;

        let left = addButtonRect.left;
        let top = addButtonRect.bottom + 10;

        if (left + formWidth > viewportWidth) {
            left = viewportWidth - formWidth - 20;
        }
        if (left < 0) {
            left = 20;
        }

        if (top + formHeight > viewportHeight) {
            top = Math.max(20, viewportHeight - formHeight - 20);
        }

        addItemForm.style.position = 'fixed';
        addItemForm.style.left = `${left}px`;
        addItemForm.style.top = `${top}px`;
    }

    function editItem(itemId) {
        const item = items.find(item => item.id === parseInt(itemId));
        if (!item) return;

        document.getElementById('itemName').value = item.name;
        document.getElementById('itemTags').value = item.tags;
        document.getElementById('itemColor').value = item.color || 'red';
        document.getElementById('itemZone').value = item.zone || '';
        document.getElementById('itemQuantity').value = item.quantity || 1;

        const warnings = item.warning ? item.warning.split(',') : [];
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = warnings.includes(checkbox.value);
        });

        dropArea.innerHTML = `<img src="${item.image_path}" style="max-width: 100%; max-height: 200px;">`;

        addItemForm.style.display = 'block';
        positionAddItemForm();

        const saveItemBtn = document.getElementById('saveItemBtn');
        saveItemBtn.textContent = 'Update Item';
        saveItemBtn.setAttribute('data-item-id', itemId);
        saveItemBtn.onclick = function() {
            updateItem(item);
        };
    }

    function updateItem(item) {
        if (!currentMapId) {
            displayErrorMessage('Please ensure a map is selected.');
            return;
        }

        const formData = new FormData();
        formData.append('name', document.getElementById('itemName').value);
        formData.append('tags', document.getElementById('itemTags').value);
        formData.append('color', document.getElementById('itemColor').value || 'red');
        formData.append('zone', document.getElementById('itemZone').value || '');
        formData.append('quantity', parseInt(document.getElementById('itemQuantity').value, 10) || 1);
        formData.append('map_id', currentMapId);
        formData.append('x_coord', item.x_coord);
        formData.append('y_coord', item.y_coord);

        const itemImageFile = document.getElementById('itemImage').files[0];
        if (itemImageFile) {
            formData.append('image', itemImageFile);
        }

        const warnings = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(input => input.value)
            .join(',');
        formData.append('warning', warnings);

        fetch(`/api/items/${item.id}`, {
            method: 'PUT',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            addItemForm.style.display = 'none';
            loadItems();
            displaySuccessMessage('Item updated successfully');
            resetForm();
        })
        .catch(error => {
            console.error('Error updating item:', error);
            displayErrorMessage('Error updating item. Please try again later.');
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
                    resetForm();
                    positionAddItemForm();
                    addItemForm.style.display = 'block';
                } else {
                    addItemForm.style.display = 'none';
                }
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
        saveItemBtn.addEventListener('click', saveItem);
    }

    function saveItem() {
        if (!selectedLocation || !currentMapId) {
            displayErrorMessage('Please select a location on the map and ensure a map is selected.');
            return;
        }

        const formData = new FormData();
        formData.append('name', itemNameInput.value);
        formData.append('tags', itemTagsInput.value);
        formData.append('x_coord', selectedLocation.x / scale);
        formData.append('y_coord', selectedLocation.y / scale);
        formData.append('map_id', currentMapId);

        const itemColorInput = document.getElementById('itemColor');
        const itemZoneInput = document.getElementById('itemZone');
        const itemQuantityInput = document.getElementById('itemQuantity');
        const itemWarningInput = document.querySelectorAll('input[type="checkbox"]:checked');

        formData.append('color', itemColorInput.value || 'red');
        formData.append('zone', itemZoneInput.value || '');
        formData.append('quantity', parseInt(itemQuantityInput.value, 10) || 1);
        
        console.log('Checking for image file');
        const itemImageFile = itemImageInput.files[0];
        if (itemImageFile) {
            console.log('Image file found:', itemImageFile.name);
            formData.append('image', itemImageFile);
        }

        const warnings = Array.from(itemWarningInput)
            .map(input => input.value)
            .join(',');
        formData.append('warning', warnings);

        console.log('Sending form data to server');
        fetch('/api/items', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Item saved successfully');
            if (addItemForm) {
                addItemForm.style.display = 'none';
            }
            loadItems();
            resetForm();
            displaySuccessMessage('Item added successfully');
        })
        .catch(error => {
            console.error('Error adding item:', error);
            displayErrorMessage('Error adding item. Please try again later.');
        });
    }

    function resetForm() {
        itemNameInput.value = '';
        itemTagsInput.value = '';
        itemImageInput.value = '';
        document.getElementById('itemColor').value = 'red';
        document.getElementById('itemZone').value = '';
        document.getElementById('itemQuantity').value = 1;
        document.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
        dropArea.innerHTML = 'Drag and drop image here';
        selectedLocation = null;
        addItemBtn.disabled = true;
        
        const saveItemBtn = document.getElementById('saveItemBtn');
        saveItemBtn.textContent = 'Save Item';
        saveItemBtn.onclick = saveItem;
        saveItemBtn.removeAttribute('data-item-id');
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
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    window.addEventListener('scroll', function() {
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    window.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        console.log('Highlight');
        dropArea.classList.add('bg-info');
    }

    function unhighlight(e) {
        console.log('Unhighlight');
        dropArea.classList.remove('bg-info');
    }

    function handleDrop(e) {
        console.log('File dropped');
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            console.log('File detected:', files[0].name);
            itemImageInput.files = files;
            updateDropAreaUI(files[0]);
            
            const saveItemBtn = document.getElementById('saveItemBtn');
            if (saveItemBtn.textContent === 'Update Item') {
                const itemId = saveItemBtn.getAttribute('data-item-id');
                updateItemImage(itemId, files[0]);
            }
        }
    }

    function updateDropAreaUI(file) {
        console.log('Updating UI with dropped file');
        const reader = new FileReader();
        reader.onload = function(e) {
            dropArea.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px;">`;
        }
        reader.readAsDataURL(file);
    }

    function updateItemImage(itemId, file) {
        const formData = new FormData();
        formData.append('image', file);

        fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Image updated successfully');
            loadItems();
            displaySuccessMessage('Item image updated successfully');
        })
        .catch(error => {
            console.error('Error updating item image:', error);
            displayErrorMessage('Error updating item image. Please try again later.');
        });
    }

    itemImageInput.addEventListener('change', function(e) {
        console.log('File input changed');
        if (this.files[0]) {
            updateDropAreaUI(this.files[0]);
            
            const saveItemBtn = document.getElementById('saveItemBtn');
            if (saveItemBtn.textContent === 'Update Item') {
                const itemId = saveItemBtn.getAttribute('data-item-id');
                updateItemImage(itemId, this.files[0]);
            }
        }
    });

    loadMaps();
});