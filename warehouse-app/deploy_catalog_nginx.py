import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

nginx = r"""server {
    listen 80;
    server_name catalog.alramzybrothers.com;
    root /var/www/catalog.alramzybrothers.com/site;
    index index.html;
    charset utf-8;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location = / { return 302 /ar/; }
    location /media/ {
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }
    location /assets/ {
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }
    location / {
        add_header Cache-Control "public, max-age=300";
        try_files $uri $uri/ =404;
    }
    error_page 404 /404.html;
}
"""

placeholder = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الرمزي إخوان</title></head><body style="font-family:sans-serif;text-align:center;padding:60px">الكتالوج قريباً</body></html>"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("147.93.40.224", username="root", password=os.environ["VPS_PASS"], timeout=20, allow_agent=False, look_for_keys=False)
sftp = client.open_sftp()
with sftp.file("/etc/nginx/sites-available/catalog.alramzybrothers.com", "w") as handle:
    handle.write(nginx)
sftp.close()

cmd = f"""
mkdir -p /var/www/catalog.alramzybrothers.com/site/ar
[ -f /var/www/catalog.alramzybrothers.com/site/ar/index.html ] || cat > /var/www/catalog.alramzybrothers.com/site/ar/index.html <<'EOF'
{placeholder}
EOF
ln -sfn /etc/nginx/sites-available/catalog.alramzybrothers.com /etc/nginx/sites-enabled/catalog.alramzybrothers.com
nginx -t && systemctl reload nginx
certbot --nginx -d catalog.alramzybrothers.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
nginx -t && systemctl reload nginx
curl -sI https://catalog.alramzybrothers.com/ar/ | head -n 1
"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=240)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
client.close()
