from app import app
from provision_maps import provision_maps
from backup_db import start_scheduler

# Provision maps
provision_maps()

# Start the backup scheduler
start_scheduler()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
