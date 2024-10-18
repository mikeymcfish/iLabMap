// ... (existing code)

document.addEventListener('DOMContentLoaded', function() {
    // ... (existing code)

    const bulkEntryBtn = document.getElementById('bulkEntryBtn');
    const bulkEntryModal = new bootstrap.Modal(document.getElementById('bulkEntryModal'));
    const submitBulkEntryBtn = document.getElementById('submitBulkEntry');

    if (bulkEntryBtn) {
        bulkEntryBtn.addEventListener('click', function() {
            bulkEntryModal.show();
        });
    }

    if (submitBulkEntryBtn) {
        submitBulkEntryBtn.addEventListener('click', processBulkEntry);
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

    // ... (existing code)
});
