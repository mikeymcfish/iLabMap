from app import create_app
from provision_maps import provision_maps
from backup_db import start_scheduler

# Start the backup scheduler
start_scheduler()

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=0, debug=True)
