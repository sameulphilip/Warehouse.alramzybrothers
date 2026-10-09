import os
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
local = Path(__file__).resolve().parent
remote_root = "/var/www/warehouse.alramzybrothers.com"
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    "147.93.40.224",
    username="root",
    password=os.environ["VPS_PASS"],
    timeout=20,
    allow_agent=False,
    look_for_keys=False,
)
sftp = client.open_sftp()
for file in local.rglob("*"):
    if not file.is_file() or "node_modules" in file.parts or "__pycache__" in file.parts or file.suffix == ".pyc" or file.name.endswith(".py"):
        continue
    remote = remote_root + "/" + file.relative_to(local).as_posix()
    if file.name in ("users.json", "activity.json", "db-target.json") or file.name.startswith(".env"):
        try:
            sftp.stat(remote)
            print("keep", remote)
            continue
        except FileNotFoundError:
            pass
    remote_dir = remote.rsplit("/", 1)[0]
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    print("upload", remote)
    sftp.put(str(file), remote)
sftp.close()
stdin, stdout, stderr = client.exec_command("chmod 600 /var/www/warehouse.alramzybrothers.com/data/users.json; if [ -f /var/www/warehouse.alramzybrothers.com/data/activity.json ]; then chmod 600 /var/www/warehouse.alramzybrothers.com/data/activity.json; fi; if [ -f /var/www/warehouse.alramzybrothers.com/data/db-target.json ]; then chmod 600 /var/www/warehouse.alramzybrothers.com/data/db-target.json; fi; pm2 restart warehouse --update-env && sleep 1 && pm2 describe warehouse | sed -n '1,20p'", timeout=40)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
client.close()
