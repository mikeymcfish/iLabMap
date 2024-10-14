import requests

BASE_URL = "http://127.0.0.1:5000"  # Change this to your actual local or server URL

def test_get_items():
    try:
        response = requests.get(f"{BASE_URL}/api/items", params={"map_id": 1})
        print("GET /api/items:", response.status_code, response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error during GET /api/items: {e}")

def test_post_item():
    try:
        data = {
            "name": "Test Item",
            "tags": "test, sample",
            "x_coord": 10.5,
            "y_coord": 20.5,
            "map_id": 1
        }
        files = {"image": open("static/thumbnails/placeholder.png", "rb")}  # Make sure to include a valid file path or omit if testing without an image
        response = requests.post(f"{BASE_URL}/api/items", data=data, files=files)
        print("POST /api/items:", response.status_code, response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error during POST /api/items: {e}")

def test_update_item(item_id):
    try:
        data = {
            "name": "Updated Test Item",
            "tags": "updated, sample",
            "x_coord": 15.0,
            "y_coord": 25.0
        }
        response = requests.put(f"{BASE_URL}/api/items/{item_id}", json=data)
        print(f"PUT /api/items/{item_id}:", response.status_code, response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error during PUT /api/items/{item_id}: {e}")

def test_delete_item(item_id):
    try:
        response = requests.delete(f"{BASE_URL}/api/items/{item_id}")
        print(f"DELETE /api/items/{item_id}:", response.status_code, response.json())
    except requests.exceptions.RequestException as e:
        print(f"Error during DELETE /api/items/{item_id}: {e}")

if __name__ == "__main__":
    # Run different test cases to debug
    test_get_items()      # Test fetching items
    test_post_item()      # Test adding a new item
    test_update_item(1)   # Test updating an item (change '1' to a valid item ID)
    test_delete_item(1)   # Test deleting an item (change '1' to a valid item ID)
