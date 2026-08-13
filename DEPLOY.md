# Production deployment — MANHAJ

This guide covers deploying the Laravel API and React SPA for production use.

## Architecture

| Component | Technology | Typical host |
|-----------|------------|--------------|
| API | Laravel 12 + Sanctum | `api.example.edu` |
| SPA | Vite + React | `learn.example.edu` |
| Database | MySQL / PostgreSQL | Managed DB |
| Queue worker | Laravel queue | Same server or worker service |
| Mail | SMTP / SES / Mailgun | External provider |

The SPA talks to the API over HTTPS using Bearer tokens. Set `VITE_API_URL` at build time so the frontend knows the API origin.

## 1. Server requirements

- PHP 8.2+ with extensions: `mbstring`, `pdo`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`
- Composer 2.x
- Node.js 20+ (build machine only)
- MySQL 8+ or PostgreSQL 14+
- Redis or database-backed queue/cache (recommended for production)

## 2. Backend setup

```bash
git clone <repo-url> manhaj && cd manhaj
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

### Required `.env` values

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.edu

FRONTEND_URL=https://learn.example.edu
CORS_ALLOWED_ORIGINS=https://learn.example.edu
SANCTUM_STATEFUL_DOMAINS=learn.example.edu

DB_CONNECTION=mysql
DB_HOST=...
DB_DATABASE=manhaj
DB_USERNAME=...
DB_PASSWORD=...

MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@example.edu
MAIL_FROM_NAME="MANHAJ"

QUEUE_CONNECTION=database
CACHE_STORE=redis
SESSION_DRIVER=database
```

Run migrations and seed demo data only in non-production environments:

```bash
php artisan migrate --force
# php artisan db:seed   # demo/staging only
```

Optimize for production:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Web server

Point the document root to `public/`. Example Nginx location block:

```nginx
root /var/www/manhaj/public;
index index.php;

location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    include fastcgi_params;
}
```

### Queue worker (password reset emails)

Password reset notifications are queued. Run a worker:

```bash
php artisan queue:work --sleep=3 --tries=3
```

Use Supervisor or systemd to keep the worker running.

## 3. Frontend build

```bash
cd frontend
cp .env.example .env
```

Set production API URL:

```env
VITE_API_URL=https://api.example.edu
```

Build and deploy static assets:

```bash
npm ci
npm run build
```

Serve the `frontend/dist/` directory from your CDN or static host (`learn.example.edu`). Configure the server to fall back to `index.html` for client-side routing.

## 4. CORS and Sanctum

- `CORS_ALLOWED_ORIGINS` must include the exact SPA origin (scheme + host + port).
- `SANCTUM_STATEFUL_DOMAINS` lists hosts that may use cookie-based SPA auth (optional if you only use Bearer tokens).
- `FRONTEND_URL` is used in password-reset email links (`/reset-password?token=...&email=...`).

## 5. Security checklist

- [ ] `APP_DEBUG=false` in production
- [ ] HTTPS everywhere (API + SPA)
- [ ] Strong `APP_KEY` (never commit `.env`)
- [ ] Mail configured (password reset requires working email)
- [ ] Login rate limiting enabled (5 attempts/minute per email+IP)
- [ ] Admin user creation requires password (min 8 chars)
- [ ] Lesson HTML sanitized server-side (HTMLPurifier) and client-side (DOMPurify)
- [ ] Rotate `INTERNAL_API_TOKEN` if ML/internal endpoints are exposed

## 6. CI

GitHub Actions runs on every push/PR to `master` or `main`:

- `php artisan test` (PHPUnit, SQLite in-memory)
- `npm test` + `npm run build` in `frontend/`

## 7. Health check

Laravel exposes `GET /up` for load balancer health checks.

## 8. Demo accounts (staging only)

After `php artisan db:seed`:

| Email | Password | Role |
|-------|----------|------|
| `student@cut.manhaj.app` | `password` | student |
| `instructor@cut.manhaj.app` | `password` | instructor |
| `admin@cut.manhaj.app` | `password` | university_admin |
| `admin@manhaj.app` | `password` | platform_admin |

Do not seed demo passwords in production.

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| SPA cannot reach API | Check `VITE_API_URL`, CORS origins, and HTTPS mixed-content |
| Login works locally but not prod | Verify API URL, CORS, and that Sanctum token is sent as `Authorization: Bearer` |
| Password reset email never arrives | Configure mail; ensure queue worker is running |
| 429 on login | Rate limit (5/min) — wait or adjust `AppServiceProvider` limiter |
