document.addEventListener('DOMContentLoaded', function() {
    const mapCanvas = document.getElementById('mapCanvas');
    const ctx = mapCanvas.getContext('2d');
    const itemList = document.getElementById('itemList');
    const searchInput = document.getElementById('searchInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemForm = document.getElementById('addItemForm');
    const saveItemBtn = document.getElementById('saveItemBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const itemNameInput = document.getElementById('itemName');
    const itemTagsInput = document.getElementById('itemTags');

    let items = [];
    let mapImage = new Image();
    let selectedLocation = null;
    let scale = 1;
    let isAddingItem = false;

    mapImage.onload = function() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        drawMap();
    };
    mapImage.src = '/static/img/makerspace_map.svg';

    function resizeCanvas() {
        const container = mapCanvas.parentElement;
        const containerWidth = container.clientWidth;
        scale = containerWidth / mapImage.width;
        mapCanvas.width = containerWidth;
        mapCanvas.height = mapImage.height * scale;
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
            ctx.arc(selectedLocation.x * scale, selectedLocation.y * scale, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
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
        ctx.arc(item.x_coord * scale, item.y_coord * scale, 8, 0, 2 * Math.PI);
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
        isAddingItem = true;
        selectedLocation = null;
        addItemBtn.disabled = true;
        mapCanvas.style.cursor = 'crosshair';
        alert('Click on the map to select a location for the new item.');
    });

    mapCanvas.addEventListener('click', function(event) {
        if (isAddingItem) {
            const rect = mapCanvas.getBoundingClientRect();
            selectedLocation = {
                x: (event.clientX - rect.left) / scale,
                y: (event.clientY - rect.top) / scale
            };
            drawMap();
            addItemForm.classList.add('show');
            isAddingItem = false;
            mapCanvas.style.cursor = 'default';
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
                addItemForm.classList.remove('show');
                loadItems();
                itemNameInput.value = '';
                itemTagsInput.value = '';
                selectedLocation = null;
                addItemBtn.disabled = false;
            }
        });
    });

    cancelAddBtn.addEventListener('click', function() {
        addItemForm.classList.remove('show');
        selectedLocation = null;
        addItemBtn.disabled = false;
        drawMap();
    });

    loadItems();
});
