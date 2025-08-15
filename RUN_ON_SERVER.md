### راه‌اندازی پروژه روی سرور

1. **پیش‌نیازها**
   - نصب Docker و Docker Compose (نسخهٔ ۲ به بالا) روی سرور
   - داشتن دامنهٔ معتبر و باز بودن پورت‌های `80` و `443`

2. **دریافت و آماده‌سازی پروژه**
   ```bash
   git clone <آدرس‌مخزن>
   cd JAM
   ```

3. **تنظیم متغیرهای محیطی**
   - در فایل `.env` مقداردهی کنید:
     ```env
     NGINX_ENV=production
     DOMAIN=<دامنه‌ی شما>
     JWT_SECRET=<رشته‌ی طولانی و امن>
     JWT_REFRESH_SECRET=<رشته‌ی طولانی و امن>
     ALLOWED_ORIGINS=https://<دامنه‌ی شما>
     ```
   - این فایل باید کنار `docker-compose.yml` قرار داشته باشد.

4. **گرفتن گواهی SSL (Let’s Encrypt)**
   ```bash
   docker compose run --rm certbot \
     certonly --webroot \
     --webroot-path=/var/www/certbot \
     -d <دامنه‌ی شما>
   ```
   - قبل از اجرا، DNS دامنه باید به IP سرور اشاره کند.
   - این کار یک‌بار انجام می‌شود؛ certbot بعداً به‌طور خودکار گواهی را تمدید می‌کند.

5. **اجرای سرویس‌ها**
   ```bash
   docker compose up --build -d
   ```
   - سرویس‌های `mongo`, `backend`, `frontend`, `nginx` (و در صورت نیاز `certbot`) در پس‌زمینه اجرا می‌شوند.
   - پس از اجرا، سایت روی `https://<دامنه>` در دسترس است.

6. **به‌روزرسانی یا ری‌استارت سرویس‌ها**
   - در صورت تغییر کد یا وابستگی‌ها:
     ```bash
     git pull
     docker compose up --build -d
     ```
   - ری‌استارت یک سرویس مشخص:
     ```bash
     docker compose restart backend
     ```

7. **پاک‌سازی و بیلد دوباره**
   اگر نیاز به پاک‌سازی کامل ایمیج‌ها و ولوم‌ها داشتید:
   ```bash
   docker compose down --rmi all --volumes --remove-orphans
   docker compose up --build -d
   ```
