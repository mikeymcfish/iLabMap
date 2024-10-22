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
    formData.append('z_coord', (selectedLocation ? selectedLocation.z || 0 : item.z_coord || 0).toString());

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
    formData.append('z_coord', selectedLocation.z || 0);
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

function loadItems() {
    if (!currentMapId) {
        console.error('No map selected');
        return;
    }

    fetch(`/api/items?map_id=${currentMapId}`)
        .then(response => response.json())
        .then(items => {
            clearItems();
            items.forEach(item => {
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
            });
        })
        .catch(error => {
            console.error('Error loading items:', error);
            displayErrorMessage('Error loading items. Please try again later.');
        });
}