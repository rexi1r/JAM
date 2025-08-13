# راهنمای راه‌اندازی و اجرای پروژه

این راهنما روش‌های اجرا و پیکربندی پروژه را در دو حالت محیط توسعه و محیط تولید توضیح می‌دهد. این فایل برای مخزنی نوشته شده است که از ساختار جدید شامل قالب‌های `nginx/default.conf.template`، `nginx/Dockerfile` و فایل‌های داکر به‌روز شده استفاده می‌کند.

## پیش‌نیازها

برای اجرای این پروژه، موارد زیر لازم است:

- **Docker** و **Docker Compose** برای مدیریت و اجرای کانتینرها (پیشنهاد: Docker 20.x به بالا و Compose 2.x به بالا)
- یک **نام دامنه معتبر** در صورتی که می‌خواهید در محیط تولید از HTTPS استفاده کنید.

## متغیرهای محیطی

فایل `docker-compose.yml` از چند متغیر محیطی استفاده می‌کند. قبل از اجرای پروژه، آن‌ها را در فایل `.env` یا در خط فرمان تعیین کنید:

| نام متغیر            | توضیح | مقدار نمونه |
|----------------------|-------|-------------|
| `NGINX_ENV`          | مشخص می‌کند Nginx در حالت توسعه (development) یا تولید (production) اجرا شود. | `development` یا `production` |
| `DOMAIN`             | نام دامنه برای محیط تولید. در محیط توسعه مقدار `localhost` کافی است. | `example.com` |
| `JWT_SECRET`         | کلید مخفی برای امضای توکن دسترسی (access token). | یک رشته‌ی تصادفی و طولانی |
| `JWT_REFRESH_SECRET` | کلید مخفی برای امضای توکن رفرش (refresh token). | یک رشته‌ی تصادفی و طولانی |
| `ALLOWED_ORIGINS`    | لیست دامنه‌هایی که اجازهٔ دسترسی CORS دارند (با کاما جدا کنید). | `http://localhost,http://localhost:3000` |

می‌توانید این متغیرها را در فایل `.env` در ریشهٔ پروژه قرار دهید تا به صورت خودکار توسط Docker Compose بارگذاری شوند.

---

## اجرای پروژه در محیط توسعه

در این حالت کل سرویس‌ها داخل ماشین خودتان اجرا می‌شوند و ارتباط‌ها با HTTP انجام می‌گیرد. نیازی به SSL و گواهی نیست.

1. در فایل `.env` مقادیر زیر را تنظیم کنید (مقادیر پیش‌فرض کافی است):

```env
NGINX_ENV=development
DOMAIN=localhost
JWT_SECRET=<یک رشته‌ی تصادفی>
JWT_REFRESH_SECRET=<یک رشته‌ی تصادفی>
ALLOWED_ORIGINS=http://localhost,http://localhost:3000
```

2. سپس در ریشهٔ پروژه برحسب نیاز یکی از دستورات زیر را اجرا کنید:

   - اجرای معمولی با build کامل:

     ```bash
     docker compose up --build
     ```

   - اجرای سریع برای توسعه با مانیتورینگ تغییرات (Hot Reload):

     ```bash
     docker compose -f docker-compose.yml -f docker-compose.dev.yml up
     ```

این دستورات سرویس‌های `mongo`، `backend`، `frontend` و `nginx` را اجرا می‌کنند. پس از اجرا، برنامه از طریق آدرس زیر در دسترس است:

- Backend API: [http://localhost/api](http://localhost/api)
- فرانت‌اند (React dev server): [http://localhost](http://localhost)

> نکته: در محیط توسعه، ارتباط روی HTTP (پورت 80) انجام می‌شود و نیازی به گواهی SSL نیست.

### پاکسازی کامل و بیلد مجدد

اگر می‌خواهید همهٔ کانتینرها، ایمیج‌ها و ولوم‌های ساخته‌شده را حذف کنید و از ابتدا پروژه را بیلد نمایید:

```bash
docker compose down --rmi all --volumes --remove-orphans
docker compose up --build
```

### ریستارت کردن یک سرویس خاص

برای راه‌اندازی مجدد یک سرویس بدون متوقف کردن سایر سرویس‌ها:

```bash
docker compose restart backend   # مثال: ریستارت سرویس backend
```

و اگر Dockerfile همان سرویس تغییر کرده باشد و نیاز به بیلد مجدد دارید:

```bash
docker compose up --build backend
```

### گردش کار روزمره در توسعه

1. **تغییر کد Backend**  
   با ذخیرهٔ فایل، `nodemon` سرویس را به‌صورت خودکار ری‌استارت می‌کند. در صورت نیاز به ری‌استارت دستی:
   ```bash
   docker compose restart backend
   ```

2. **تغییر کد Frontend**  
   تغییرات با Hot Module Replacement به‌صورت لحظه‌ای اعمال می‌شوند.

3. **تغییر وابستگی‌ها (package.json)**  
   فقط همان سرویس را داخل کانتینر نصب کنید، زیرا `node_modules` به‌صورت volume مونت شده است:
   ```bash
   docker compose exec backend npm ci     # یا در frontend
   ```
   اگر دستور نصب خودکار دارد، ری‌استارت سرویس کافی است:
   ```bash
   docker compose restart backend
   ```

4. **تغییر قالب توسعهٔ Nginx**  
   برای بیلد مجدد بدون وابستگی سایر سرویس‌ها:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --build nginx
   ```

5. **وضعیت Mongo در توسعه**  
   در حالت پایه از ایمیج رسمی `mongo:7` با volume `mongo_data` استفاده می‌شود و نیازی به override نیست.  
   برای اتصال به `mongosh` از میزبان، می‌توانید به‌صورت اختیاری پورت را publish کنید:
   ```yaml
   services:
     mongo:
       ports:
         - "27017:27017"
   ```
   سرویس `mongo-express` در آدرس [http://localhost:8081](http://localhost:8081) برای بازرسی سریع دیتابیس در دسترس است.

6. **نکته‌های کاربردی**  
   - مقدار `NGINX_ENV=development` در `.env` باعث استفاده از قالب توسعه می‌شود.  
   - `ALLOWED_ORIGINS` شامل `http://localhost` و `http://localhost:3000` است؛ هنگام استفاده از Nginx روی `http://localhost` همین کافی است.  
   - Backend با `MONGO_URI` شبکهٔ داخلی به Mongo متصل می‌شود و معمولاً نیاز به ری‌استارت Mongo ندارد.

---

## اجرای پروژه در محیط تولید

برای اجرای پروژه روی سرور واقعی و با استفاده از HTTPS:

1. متغیرها را در `.env` یا محیط سیستم تنظیم کنید:

```env
NGINX_ENV=production
DOMAIN=<نام_دامنه_شما>
JWT_SECRET=<کلید قوی>
JWT_REFRESH_SECRET=<کلید قوی>
ALLOWED_ORIGINS=https://<نام_دامنه_شما>
```

2. دریافت گواهی SSL با Certbot:

```bash
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d <نام_دامنه_شما>
```

3. اجرای سرویس‌ها در پس‌زمینه:

```bash
docker compose up --build -d
```

4. Certbot هر ۱۲ ساعت یک بار به طور خودکار گواهی‌ها را تمدید می‌کند.

---

## ساختار سرویس‌ها

- **mongo**: دیتابیس MongoDB 7
- **backend**: سرور Node.js/Express روی پورت 5000
- **frontend**: در حالت توسعه Dev Server React، در تولید build نهایی
- **nginx**: مدیریت درخواست‌ها و SSL termination
- **certbot**: (اختیاری) دریافت و تمدید گواهی Let’s Encrypt

---

## نکات امنیتی

- همیشه برای `JWT_SECRET` و `JWT_REFRESH_SECRET` از مقادیر طولانی و غیرقابل حدس استفاده کنید.
- در تولید، CORS را محدود به دامنهٔ واقعی خود کنید.

---

## مدیریت کاربران و تنظیمات

1. ورود اولیه با نام کاربری `admin` و رمز `admin` (به‌صورت خودکار در اولین اجرا ایجاد می‌شود) یا ساخت کاربر جدید از API `/api/users`
2. تغییر تنظیمات از `/settings`

---

## سوال متداول

### آیا در محیط توسعه به SSL نیاز دارم؟

خیر. در محیط توسعه پروژه روی localhost یا IP لوکال اجرا می‌شود و نیازی به SSL نیست.

## راه‌اندازی فرانت‌اند (Vite + Tailwind v4 + shadcn)

بخش فرانت‌اند با Vite و TailwindCSS v4 پیکربندی شده است و از کتابخانه‌ی shadcn برای
کامپوننت‌ها استفاده می‌کند. برای اجرا:

1. نصب وابستگی‌ها:
   ```bash
   cd frontend
   npm install
   ```
2. اجرای سرور توسعه:
   ```bash
   npm run dev
   # یا روی شبکه:
   npm run dev -- --host
   ```

Alias `@` به مسیر `src/` اشاره می‌کند (`vite.config.mjs` و `jsconfig.json`) و حالت RTL در
`index.html` فعال است. فایل `src/index.css` شامل پیکربندی کامل Tailwind و توکن‌های
رنگی پایه است.
