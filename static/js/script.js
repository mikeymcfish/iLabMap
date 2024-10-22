// ... (keep the existing code)

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

// ... (keep the remaining code)
