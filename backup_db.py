import os
import subprocess
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import logging

# Set up logging
logging.basicConfig(filename='backup.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def create_backup():
    try:
        # Get environment variables
        pg_host = os.environ.get('PGHOST')
        pg_database = os.environ.get('PGDATABASE')
        pg_port = os.environ.get('PGPORT')
        pg_user = os.environ.get('PGUSER')
        pg_password = os.environ.get('PGPASSWORD')

        # Create timestamp for the backup file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_{timestamp}.sql"

        # Ensure the backups directory exists
        os.makedirs('backups', exist_ok=True)

        # Full path for the backup file
        backup_path = os.path.join('backups', backup_file)

        # Construct the pg_dump command
        command = [
            'pg_dump',
            f'-h{pg_host}',
            f'-p{pg_port}',
            f'-U{pg_user}',
            f'-d{pg_database}',
            f'-f{backup_path}'
        ]

        # Set PGPASSWORD environment variable for the subprocess
        env = os.environ.copy()
        env['PGPASSWORD'] = pg_password

        # Execute the pg_dump command
        subprocess.run(command, env=env, check=True)

        logging.info(f"Backup created successfully: {backup_file}")
    except Exception as e:
        logging.error(f"Backup failed: {str(e)}")

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(create_backup, 'interval', days=1)
    scheduler.start()
    logging.info("Scheduler started")

if __name__ == "__main__":
    start_scheduler()
