from app import app
from provision_maps import provision_maps

# Provision maps
provision_maps()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
