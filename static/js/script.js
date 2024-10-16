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

    selectedLocation = {
        x: item.x_coord * scale,
        y: item.y_coord * scale
    };
    console.log('Edit mode: Selected location set to', selectedLocation);
    drawMap();
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

    const newX = selectedLocation ? selectedLocation.x / scale : item.x_coord;
    const newY = selectedLocation ? selectedLocation.y / scale : item.y_coord;
    formData.append('x_coord', newX.toString());
    formData.append('y_coord', newY.toString());

    console.log('Updating item coordinates:', { x: newX, y: newY });

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
        console.log('Item updated successfully:', data);
        addItemForm.style.display = 'none';
        loadItems();
        displaySuccessMessage('Item updated successfully');
        resetForm();
        selectedLocation = null;
        drawMap();
    })
    .catch(error => {
        console.error('Error updating item:', error);
        displayErrorMessage('Error updating item. Please try again later.');
    });
}
