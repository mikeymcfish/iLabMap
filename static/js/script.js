document.addEventListener('DOMContentLoaded', function() {
    // ... (existing code) ...

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
                        imageElement.src = '/static/img/default.png';
                    }
                })
                .catch(() => {
                    imageElement.src = '/static/img/default.png';
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

            buttonsContainer.appendChild(detailsButton);

            if (isAdmin) {
                const editButton = document.createElement('button');
                editButton.classList.add('btn', 'btn-outline-secondary', 'btn-sm', 'me-2', 'edit-item');
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.setAttribute('data-item-id', item.id);

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('btn', 'btn-outline-danger', 'btn-sm', 'delete-item');
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.setAttribute('data-item-id', item.id);

                buttonsContainer.appendChild(editButton);
                buttonsContainer.appendChild(deleteButton);
            }

            mainContent.appendChild(imageNameContainer);
            mainContent.appendChild(buttonsContainer);

            li.appendChild(mainContent);

            li.addEventListener('mouseover', () => highlightItem(item));
            li.addEventListener('mouseout', drawMap);

            itemList.appendChild(li);
        });

        if (isAdmin) {
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

        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                const itemId = this.getAttribute('data-item-id');
                showItemDetails(itemId);
            });
        });
    }

    // ... (rest of the existing code) ...

    // Update the visibility of the Add Item button based on admin status
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }

    // ... (rest of the existing code) ...
});
