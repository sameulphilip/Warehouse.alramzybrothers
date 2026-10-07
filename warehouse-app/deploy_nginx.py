import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

nginx = """server {
    listen 80;
    server_name warehouse.alramzybrothers.com;
    location / {
        proxy_pass http://127.0.0.1:3015;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

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
with sftp.file("/etc/nginx/sites-available/warehouse.alramzybrothers.com", "w") as handle:
    handle.write(nginx)
sftp.close()

cmd = """
ln -sfn /etc/nginx/sites-available/warehouse.alramzybrothers.com /etc/nginx/sites-enabled/warehouse.alramzybrothers.com
nginx -t && systemctl reload nginx
certbot --nginx -d warehouse.alramzybrothers.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
client.close()
