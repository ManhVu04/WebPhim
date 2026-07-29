# WebPhim production checklist

Target: FE static files served by Nginx, Spring Boot backend on `127.0.0.1:8080`, MongoDB replica set, HTTPS only.

## Required environment

```bash
SPRING_PROFILES_ACTIVE=prod
MONGODB_URI=mongodb://user:password@mongo1:27017,mongo2:27017,mongo3:27017/webphim?replicaSet=rs0
OPHIM_BASE_URL=https://ophim1.com/v1/api/
APP_AUTH_ISSUER=https://webphim.example
APP_PUBLIC_URL=https://webphim.example
APP_CORS_ALLOWED_ORIGINS=https://webphim.example
APP_AUTH_REFRESH_COOKIE_SECURE=true
APP_AUTH_REFRESH_COOKIE_SAME_SITE=Lax
APP_SECURITY_CSP_ALLOWED_FRAME_HOSTS=
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer@example.com
SMTP_PASS=replace-with-secret
MAIL_FROM=mailer@example.com
APP_MAIL_OUTBOX_ENCRYPTION_KEY=replace-with-base64-encoded-32-byte-key
```

Generate `APP_MAIL_OUTBOX_ENCRYPTION_KEY` with:

```bash
openssl rand -base64 32
```

Do not set `APP_AUTH_ISSUER`, `APP_PUBLIC_URL`, or CORS origins to localhost in prod. The `prod` profile now fails startup for insecure public URLs or insecure refresh cookies.

## Build and deploy

```bash
cd BEPhim
./mvnw clean package

cd ../fe
npm ci
npm run lint
npm test
VITE_PUBLIC_SITE_URL="$APP_PUBLIC_URL" npm run build:prerender
npm run audit:ci
```

Copy `BEPhim/target/BEPhim-0.0.1-SNAPSHOT.jar` to the server and run it as a systemd service with the env file above. Copy `fe/dist/` to the Nginx web root.

## Nginx shape

```nginx
map $uri $spa_robots {
  default "noindex, nofollow";
  ~^/(xem/[^/]+|tim-kiem)$ "noindex, follow";
}

server {
  listen 443 ssl http2;
  server_name webphim.example;

  root /var/www/webphim/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host $host;
  }

  location /actuator/health/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    try_files $uri $uri/index.html @spa_fallback;
  }

  # Apply these permanent redirects only to public, indexable list routes.
  location ~ ^/(danh-sach/[^/]+|the-loai/[^/]+|quoc-gia/[^/]+|nam-phat-hanh/[0-9]+)$ {
    if ($arg_page = 1) {
      return 308 https://$host$uri;
    }
    if ($arg_page ~ ^[2-9][0-9]*$) {
      return 308 https://$host$uri/trang/$arg_page;
    }
    try_files $uri $uri/index.html @spa_fallback;
  }

  # Utility/private/unknown SPA URLs must not enter the search index.
  location @spa_fallback {
    add_header X-Robots-Tag $spa_robots always;
    rewrite ^ /index.html break;
  }
}
```

Keep backend port `8080` bound to localhost or blocked by firewall. Terminate TLS at Nginx.

## Smoke checks

```bash
curl -fsS https://webphim.example/actuator/health/readiness
curl -I https://webphim.example/
curl -I 'https://webphim.example/the-loai/hanh-dong?page=2'
curl -I https://webphim.example/the-loai/hanh-dong/trang/2
```

Then test in browser: home, movie detail, watch page, register, login, refresh after reload, logout, favorites, history.

## Ops

- MongoDB must be a replica set; app transactions depend on it.
- Back up MongoDB daily and test restore before launch.
- Backend dependency audit must pass in Jenkins with `oss-index-api`; local unauthenticated audit can be rate limited.
- FE audit currently has an accepted `react-router` advisory exception until `2026-10-27`; review before that date.
