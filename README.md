راهنمای راه‌اندازی و اجرای پروژه
این راهنما مراحل لازم برای راه‌اندازی پروژه با استفاده از Docker Compose را در دو محیط لوکال و سرور (Production) توضیح می‌دهد.

پیش‌نیازها
قبل از شروع، مطمئن شوید که ابزارهای زیر روی سیستم شما نصب هستند:

Docker: برای مدیریت کانتینرها.

Docker Compose: برای اجرای چندین کانتینر به صورت همزمان.

۱. فایل docker-compose.yml
این فایل سرویس‌های اصلی پروژه (frontend, backend, nginx, mongo, certbot) را تعریف می‌کند.

متغیرهای محیطی
در فایل docker-compose.yml، دو متغیر محیطی اصلی وجود دارد که باید آن‌ها را تنظیم کنید:

NGINX_ENV: این متغیر محیط اجرای Nginx را مشخص می‌کند.

برای اجرای لوکال، آن را به development تنظیم کنید.

برای اجرای روی سرور، آن را به production تنظیم کنید.

DOMAIN: این متغیر برای اجرای روی سرور استفاده می‌شود. آن را با نام دامنه خود جایگزین کنید (مانند example.com).

version: '3.8'

services:
backend:
build: ./backend
depends_on:
- mongo
environment:
- MONGO_URI=mongodb://admin:password@mongo:27017/contracts
# Change this secret key to a long, random string
- JWT_SECRET=my_super_secret_jwt_key_1234567890
- NODE_ENV=development

frontend:
build: ./frontend
depends_on:
- backend

nginx:
image: nginx:alpine
ports:
- "80:80"
- "443:443"
volumes:
- ./nginx:/etc/nginx
- certbot-web:/var/www/certbot
- certbot-etc:/etc/letsencrypt
depends_on:
- frontend
- backend
environment:
# Change this variable to 'production' for server deployment
- NGINX_ENV=development
- DOMAIN=your_domain.com

certbot:
image: certbot/certbot
volumes:
- certbot-web:/var/www/certbot
- certbot-etc:/etc/letsencrypt
entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $$!; done;'"

mongo:
image: mongo
ports:
- "27017:27017"
volumes:
- mongo-data:/data/db
environment:
- MONGO_INITDB_ROOT_USERNAME=admin
- MONGO_INITDB_ROOT_PASSWORD=password

volumes:
mongo-data:
certbot-etc:
certbot-web:

۲. نحوه اجرا
اجرای لوکال (Development)
برای اجرای پروژه در محیط لوکال، فقط کافی است NGINX_ENV را در فایل docker-compose.yml روی development تنظیم کنید و سپس دستور زیر را در ریشه پروژه اجرا کنید:

docker-compose up --build

دسترسی: پس از اجرای موفق، برنامه از طریق آدرس http://localhost:80 قابل دسترسی خواهد بود.

اجرای روی سرور (Production)
برای اجرای روی سرور، ابتدا NGINX_ENV را به production و DOMAIN را با دامنه واقعی خود جایگزین کنید. سپس دستور زیر را اجرا کنید:

docker-compose up --build -d

دسترسی: برنامه شما از طریق آدرس دامنه (مثلاً https://your_domain.com) در دسترس خواهد بود.

۳. مدیریت کاربران
نام کاربری و کلمه عبور پیش‌فرض برای لاگین در بک‌اند admin و admin هستند.

پس از ورود، می‌توانید به صفحه مدیریت کاربران رفته و کاربران جدید ایجاد کنید و رمز عبور آن‌ها را تغییر دهید.