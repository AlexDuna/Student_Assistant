import os
import time
from datetime import datetime, timedelta

SUMMARY_DIR = "static/summaries"
EXPIRY_HOURS = 4

def cleanup_old_summaries():
    now = time.time()
    deleted = 0

    for filename in os.listdir(SUMMARY_DIR):
        filepath = os.path.join(SUMMARY_DIR, filename)
        if not os.path.isfile(filepath):
            continue

        file_mtime = os.path.getmtime(filepath)
        if now - file_mtime > EXPIRY_HOURS * 3600:
            os.remove(filepath)
            deleted += 1
            print(f"Deleted: {filename}")

    print(f"Cleanup complete. {deleted} files removed.")

if __name__ == "__main__":
    cleanup_old_summaries()