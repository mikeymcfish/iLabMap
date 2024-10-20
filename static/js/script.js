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

    const openChatBtn = document.getElementById('openChatBtn');
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendMessage = document.getElementById('sendMessage');

    if (openChatBtn) {
        openChatBtn.addEventListener('click', function() {
            chatModal.show();
        });
    }

    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.innerHTML = `<div class="message-content">${marked.parse(message)}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    const loadingSpinner = document.getElementById('loadingSpinner');

    function sendChatMessage() {
        const message = userInput.value.trim();
        if (message) {

            addMessage(message, true);
            userInput.value = '';
            const parentDiv = loadingSpinner.parentElement;
            parentDiv.appendChild(loadingSpinner);
            loadingSpinner.style.display = 'block';

            fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            })
            .then(response => response.json())
            .then(data => {
                loadingSpinner.style.display = 'none';
                if (data.error) {
                    addMessage('Error: ' + data.error);
                } else {
                    addMessage(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                addMessage('Error occurred while sending message');
            });
        }
    }

    if (sendMessage) {
        sendMessage.addEventListener('click', sendChatMessage);
    }

    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }

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

    function snapTo2x(pixel) {
      return Math.round(pixel / 2) * 2;
    }
    function snapTo5x(pixel) {
      return Math.round(pixel / 5) * 5;
    }

    function drawMap() {
        
        if (ctx && mapImage.complete && mapImage.naturalHeight !== 0) {
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
            ctx.drawImage(mapImage, 0, 0, mapCanvas.width, mapCanvas.height);
            items.forEach(item => {
                const snappedX = snapTo5x(item.x_coord);
                const snappedY = snapTo5x(item.y_coord);
                ctx.fillStyle = 'green';
                ctx.beginPath();
                ctx.arc(snappedX * scale, snappedY * scale, 5, 0, 2 * Math.PI);
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
            li.classList.add('list-group-item', 'd-flex', 'flex-column', 'align-items-start', 'p-3', 'mb-2');

            const mainContent = document.createElement('div');
            mainContent.classList.add('d-flex', 'w-100', 'justify-content-between', 'align-items-center');

            const imageNameContainer = document.createElement('div');
            imageNameContainer.classList.add('d-flex', 'align-items-center');

            const imageElement = document.createElement('img');
            fetch(item.image_path, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        imageElement.src = item.image_path;
                    } else {
                        imageElement.src = '/static/img/default.png'; // Path to default image
                    }
                })
                .catch(() => {
                    imageElement.src = '/static/img/default.png'; // Path to default image
                });
            imageElement.width = 60;
            imageElement.height = 60;
            imageElement.alt = item.name;
            imageElement.classList.add('me-3', 'rounded');
            imageElement.style.objectFit = 'cover';

            const infoElement = document.createElement('div');
            infoElement.classList.add('d-flex', 'flex-column');

            const nameElement = document.createElement('h5');
            nameElement.classList.add('mb-1', 'item-name');
            nameElement.textContent = item.quantity !== null && item.quantity !== 1 ? `${item.name} (${item.quantity})` : item.name;

            infoElement.appendChild(nameElement);

            if (item.tags && item.tags.trim() !== '') {
                const tagContainer = document.createElement('div');
                tagContainer.classList.add('tag-container');
                tagContainer.innerHTML = item.tags.split(',')
                    .map(tag => `<span class="item-tag">${tag.trim()}</span>`)
                    .join('');
                infoElement.appendChild(tagContainer);
            }

            imageNameContainer.appendChild(imageElement);
            imageNameContainer.appendChild(infoElement);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.classList.add('d-flex', 'align-items-center');

            if (item.warning) {
                const warnings = item.warning.split(',').filter(warning => warning.trim() !== "");
                warnings.forEach(warning => {
                    const warningBadge = document.createElement('div');
                    warningBadge.classList.add('warning-badges', 'me-2');
                    const warningIcon = document.createElement('i');
                    warningIcon.classList.add('fas', 'fa-sm', `fa-${warning.trim()}`);
                    warningBadge.appendChild(warningIcon);
                    buttonsContainer.appendChild(warningBadge);
                });
            }

            const detailsButton = document.createElement('button');
            detailsButton.classList.add('btn', 'btn-outline-info', 'btn-sm', 'me-2', 'view-details');
            detailsButton.innerHTML = '<i class="fas fa-expand-alt"></i>';
            detailsButton.setAttribute('data-item-id', item.id);

            const editButton = document.createElement('button');
            editButton.classList.add('btn', 'btn-outline-secondary', 'btn-sm', 'me-2', 'edit-item');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.setAttribute('data-item-id', item.id);

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('btn', 'btn-outline-danger', 'btn-sm', 'delete-item');
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.setAttribute('data-item-id', item.id);

            buttonsContainer.appendChild(detailsButton);
            buttonsContainer.appendChild(editButton);
            buttonsContainer.appendChild(deleteButton);

            mainContent.appendChild(imageNameContainer);
            mainContent.appendChild(buttonsContainer);

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

        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const itemId = this.getAttribute('data-item-id');
                showItemDetails(itemId);
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

    function showItemDetails(itemId) {
        const item = items.find(item => item.id === parseInt(itemId));
        if (!item) {
            console.error('Item not found:', itemId);
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('itemDetailsModal'));

        document.getElementById('itemDetailsImage').src = item.image_path;
        document.getElementById('itemDetailsName').textContent = item.name;
        document.getElementById('itemDetailsTags').textContent = item.tags;
        document.getElementById('itemDetailsQuantity').textContent = `Quantity: ${item.quantity}`;
        document.getElementById('itemDetailsDescription').textContent = item.description || 'No description available';

        const linkElement = document.getElementById('itemDetailsLink');
        if (item.link) {
            linkElement.href = item.link;
            linkElement.style.display = 'inline';
        } else {
            linkElement.style.display = 'none';
        }

        const warningsContainer = document.getElementById('itemDetailsWarnings');
        warningsContainer.innerHTML = '';
        if (item.warning) {
            const warnings = item.warning.split(',').filter(warning => warning.trim() !== "");
            warnings.forEach(warning => {
                const warningBadge = document.createElement('div');
                warningBadge.classList.add('warning-badges', 'me-2');
                const warningIcon = document.createElement('i');
                warningIcon.classList.add('fas', 'fa-sm', `fa-${warning.trim()}`);
                warningBadge.appendChild(warningIcon);
                warningsContainer.appendChild(warningBadge);
            });
        }

        modal.show();
    }

    function editItem(itemId) {
        console.log('Editing item:', itemId);
        const item = items.find(item => item.id === parseInt(itemId));
        if (!item) {
            console.error('Item not found:', itemId);
            return;
        }

        document.getElementById('itemName').value = item.name;
        document.getElementById('itemTags').value = item.tags;
        document.getElementById('itemColor').value = item.color || 'red';
        document.getElementById('itemZone').value = item.zone || '';
        document.getElementById('itemQuantity').value = item.quantity || 1;
        document.getElementById('itemDescription').value = item.description || '';
        document.getElementById('itemLink').value = item.link || '';

        const warnings = item.warning ? item.warning.split(',') : [];
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = warnings.includes(checkbox.value);
        });

        dropArea.innerHTML = `<img src="${item.image_path}" style="max-width: 100%; max-height: 200px;">`;

        addItemForm.style.display = 'block';
        positionAddItemForm();

        updateItemBtn.textContent = 'Update Item';
        updateItemBtn.setAttribute('data-item-id', itemId);
        updateItemBtn.onclick = function() {
            updateItem(item);
        };

        selectedLocation = {
            x: item.x_coord * scale,
            y: item.y_coord * scale
        };
        drawMap();
    }

    function updateItem(item) {
        if (!currentMapId) {
            displayErrorMessage('Please ensure a map is selected.');
            return;
        }

        const updateButton = document.getElementById('updateItemBtn');
        updateButton.disabled = true;
        updateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';

        const formData = new FormData();
        formData.append('name', document.getElementById('itemName').value);
        formData.append('tags', document.getElementById('itemTags').value);
        formData.append('color', document.getElementById('itemColor').value || 'red');
        formData.append('zone', document.getElementById('itemZone').value || '');
        formData.append('quantity', parseInt(document.getElementById('itemQuantity').value, 10) || 1);
        formData.append('map_id', currentMapId);
        formData.append('description', document.getElementById('itemDescription').value);
        formData.append('link', document.getElementById('itemLink').value);

        formData.append('x_coord', (selectedLocation ? selectedLocation.x / scale : item.x_coord).toString());
        formData.append('y_coord', (selectedLocation ? selectedLocation.y / scale : item.y_coord).toString());

        const itemImageFile = document.getElementById('itemImage').files[0];
        if (itemImageFile) {
            formData.append('image', itemImageFile);
        }

        const warnings = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(input => input.value)
            .join(',');
        formData.append('warning', warnings);

        console.log('Updating item:', item.id);
        console.log('Form data:', Object.fromEntries(formData));

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
            console.log('Item updated successfully:', data);
            addItemForm.style.display = 'none';
            loadItems();
            displaySuccessMessage('Item updated successfully');
            resetForm();
            selectedLocation = null;
        })
        .catch(error => {
            console.error('Error updating item:', error);
            displayErrorMessage('Error updating item. Please try again later.');
        })
        .finally(() => {
            updateButton.disabled = false;
            updateButton.textContent = 'Update Item';
        });
    }

    function saveItem() {
        if (!selectedLocation || !currentMapId) {
            displayErrorMessage('Please select a location on the map and ensure a map is selected.');
            return;
        }

        const saveButton = document.getElementById('updateItemBtn');
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

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
        })
        .finally(() => {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Item';
        });
    }

    function resetForm() {
        itemNameInput.value = '';
        itemTagsInput.value = '';
        itemImageInput.value = '';
        document.getElementById('itemColor').value = 'red';
        document.getElementById('itemZone').value = '';
        document.getElementById('itemQuantity').value = 1;
        document.getElementById('itemDescription').value = '';
        document.getElementById('itemLink').value = '';
        document.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
        dropArea.innerHTML = 'Drag and drop image here';
        selectedLocation = null;
        addItemBtn.disabled = true;

        updateItemBtn.textContent = 'Save Item';
        updateItemBtn.onclick = saveItem;
        updateItemBtn.removeAttribute('data-item-id');
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

            if (addItemForm.style.display === 'block') {
                if (updateItemBtn.textContent === 'Update Item') {
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
                if (addItemForm.style.display === 'none' || addItemForm.style.display === '') {
                    resetForm();
                    positionAddItemForm();
                    addItemForm.style.display = 'block';
                } else {
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
        if (addItemForm && addItemForm.style.display === 'block') {
            positionAddItemForm();
        }
    });

    window.addEventListener('scroll', function() {
        if (addItemForm && addItemForm.style.display === 'block') {
            // positionAddItemForm();
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

            if (updateItemBtn.textContent === 'Update Item') {
                const itemId = updateItemBtn.getAttribute('data-item-id');
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

            if (updateItemBtn.textContent === 'Update Item') {
                const itemId = updateItemBtn.getAttribute('data-item-id');
                updateItemImage(itemId, this.files[0]);
            }
        }
    });

    loadMaps();
});