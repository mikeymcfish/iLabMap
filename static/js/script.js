document.addEventListener('DOMContentLoaded', function() {
    // Existing code...

    const bulkEntryBtn = document.getElementById('bulkEntryBtn');
    const bulkEntryModal = new bootstrap.Modal(document.getElementById('bulkEntryModal'));
    const saveBulkEntryBtn = document.getElementById('saveBulkEntryBtn');

    bulkEntryBtn.addEventListener('click', function() {
        bulkEntryModal.show();
    });

    function parseBulkEntryText(text) {
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const [name, tags, quantity, description, link] = line.split(',').map(item => item.trim());
            if (name) {
                return {
                    name,
                    tags,
                    quantity: parseInt(quantity) || 1,
                    description: description || '',
                    link: link || ''
                };
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

    // Enable bulk entry button when a map is selected
    if (mapSelector) {
        mapSelector.addEventListener('change', function() {
            // Existing code...
            bulkEntryBtn.disabled = !this.value;
        });
    }

    // Existing code...
});
