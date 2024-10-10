document.addEventListener('DOMContentLoaded', function() {
    const mapCanvas = document.getElementById('mapCanvas');
    const ctx = mapCanvas.getContext('2d');
    const itemList = document.getElementById('itemList');
    const searchInput = document.getElementById('searchInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const clearBtn = document.getElementById('clearBtn');
    const addItemForm = document.getElementById('addItemForm');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const itemNameInput = document.getElementById('itemName');
    const itemTagsInput = document.getElementById('itemTags');
    const mapSelector = document.getElementById('mapSelector');

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

    function resizeCanvas() {
        const container = mapCanvas.parentElement;
        const containerWidth = container.clientWidth;
        mapCanvas.width = containerWidth;
        mapCanvas.height = (mapImage.height / mapImage.width) * containerWidth;
        scale = containerWidth / mapImage.width;
        drawMap();
    }

    function drawMap() {
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
    }

    function loadMaps() {
        fetch('/api/maps')
            .then(response => response.json())
            .then(data => {
                mapSelector.innerHTML = '<option value="">Select a map</option>';
                data.forEach(map => {
                    const option = document.createElement('option');
                    option.value = map.id;
                    option.textContent = map.name;
                    mapSelector.appendChild(option);
                });
            });
    }

    function loadItems() {
        if (!currentMapId) return;
        fetch(`/api/items?map_id=${currentMapId}`)
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
            li.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${item.name}</h5>
                </div>
                <div class="tag-container">
                    ${item.tags.split(',').map(tag => `<span class="item-tag">${tag.trim()}</span>`).join('')}
                </div>
            `;
            li.addEventListener('mouseover', () => highlightItem(item));
            li.addEventListener('mouseout', drawMap);
            itemList.appendChild(li);
        });
    }

    function highlightItem(item) {
        drawMap();
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(item.x_coord * scale, item.y_coord * scale, 8, 0, 2 * Math.PI);
        ctx.fill();
    }

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        fetch(`/api/search?q=${encodeURIComponent(query)}&map_id=${currentMapId}`)
            .then(response => response.json())
            .then(data => {
                items = data;
                updateItemList();
                drawMap();
            });
    });

    mapCanvas.addEventListener('click', function(event) {
        const rect = mapCanvas.getBoundingClientRect();
        const scaleX = mapCanvas.width / rect.width;
        const scaleY = mapCanvas.height / rect.height;
        selectedLocation = {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
        drawMap();
        addItemBtn.disabled = false;
    });

    addItemBtn.addEventListener('click', function() {
        if (selectedLocation) {
            addItemForm.style.display = 'block';
            addItemForm.style.left = `${selectedLocation.x / scale}px`;
            addItemForm.style.top = `${selectedLocation.y / scale}px`;
        }
    });

    clearBtn.addEventListener('click', function() {
        selectedLocation = null;
        addItemBtn.disabled = true;
        addItemForm.style.display = 'none';
        drawMap();
    });

    saveItemBtn.addEventListener('click', function() {
        if (!selectedLocation || !currentMapId) {
            alert('Please select a location on the map and ensure a map is selected.');
            return;
        }

        const newItem = {
            name: itemNameInput.value,
            tags: itemTagsInput.value,
            x_coord: selectedLocation.x / scale,
            y_coord: selectedLocation.y / scale,
            map_id: currentMapId
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
                addItemForm.style.display = 'none';
                loadItems();
                itemNameInput.value = '';
                itemTagsInput.value = '';
                selectedLocation = null;
                addItemBtn.disabled = true;
            }
        });
    });

    cancelAddBtn.addEventListener('click', function() {
        addItemForm.style.display = 'none';
    });

    mapSelector.addEventListener('change', function() {
        currentMapId = this.value;
        if (currentMapId) {
            fetch(`/api/maps/${currentMapId}`)
                .then(response => response.json())
                .then(data => {
                    mapImage.src = data.svg_path;
                    loadItems();
                });
        } else {
            ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
            items = [];
            updateItemList();
        }
    });

    loadMaps();
});
