document.addEventListener('DOMContentLoaded', function() {
    const mapCanvas = document.getElementById('mapCanvas');
    const ctx = mapCanvas.getContext('2d');
    const itemList = document.getElementById('itemList');
    const searchInput = document.getElementById('searchInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemModal = new bootstrap.Modal(document.getElementById('addItemModal'));
    const saveItemBtn = document.getElementById('saveItemBtn');
    const itemNameInput = document.getElementById('itemName');
    const itemTagsInput = document.getElementById('itemTags');

    let items = [];
    let mapImage = new Image();
    let selectedLocation = null;

    mapImage.onload = function() {
        mapCanvas.width = mapImage.width;
        mapCanvas.height = mapImage.height;
        drawMap();
    };
    mapImage.src = '/static/img/makerspace_map.svg';

    function drawMap() {
        ctx.drawImage(mapImage, 0, 0);
        items.forEach(item => {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(item.x_coord, item.y_coord, 5, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    function loadItems() {
        fetch('/api/items')
            .then(response => response.json())
            .then(data => {
                items = data;
                updateItemList();
                drawMap();
            });
    }

    function updateItemList() {
        itemList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('a');
            li.classList.add('list-group-item', 'list-group-item-action');
            li.textContent = item.name;
            li.addEventListener('mouseover', () => highlightItem(item));
            li.addEventListener('mouseout', drawMap);
            itemList.appendChild(li);
        });
    }

    function highlightItem(item) {
        drawMap();
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(item.x_coord, item.y_coord, 8, 0, 2 * Math.PI);
        ctx.fill();
    }

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                items = data;
                updateItemList();
                drawMap();
            });
    });

    addItemBtn.addEventListener('click', function() {
        selectedLocation = null;
        addItemModal.show();
    });

    mapCanvas.addEventListener('click', function(event) {
        if (addItemModal._isShown) {
            const rect = mapCanvas.getBoundingClientRect();
            selectedLocation = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
            drawMap();
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(selectedLocation.x, selectedLocation.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });

    saveItemBtn.addEventListener('click', function() {
        if (!selectedLocation) {
            alert('Please select a location on the map.');
            return;
        }

        const newItem = {
            name: itemNameInput.value,
            tags: itemTagsInput.value,
            x_coord: selectedLocation.x,
            y_coord: selectedLocation.y
        };

        fetch('/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newItem),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addItemModal.hide();
                loadItems();
                itemNameInput.value = '';
                itemTagsInput.value = '';
            }
        });
    });

    loadItems();
});
