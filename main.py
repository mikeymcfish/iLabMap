from app import create_app
from provision_maps import provision_maps
from backup_db import start_scheduler
import os

# Provision maps
provision_maps()

# Start the backup scheduler
start_scheduler()

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
