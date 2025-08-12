# راه‌اندازی پروژه React با Vite + Tailwind v4 + shadcn

این راهنما به شما کمک می‌کند پروژه‌ی React خود را از هر ساختاری (حتی CRA) به یک ساختار مدرن با Vite، TailwindCSS v4 و shadcn ارتقا دهید.

---

## 1) نصب وابستگی‌ها و اسکریپت‌ها
```bash
cd frontend
# پاک‌سازی وابستگی‌های قدیمی (اختیاری ولی مفید)
rm -rf node_modules package-lock.json
npm i

# نصب ابزارهای جدید
npm i -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
npm i zustand lucide-react
```

`package.json` → بخش scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host"
  }
}
```

---

## 2) پیکربندی Vite + alias
**`vite.config.mjs`** در ریشه پروژه:
```js
import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
```

---

## 3) alias برای ایمپورت‌ها
**`jsconfig.json`** در ریشه:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 4) تنظیم Tailwind v4
فایل **`src/index.css`**:
```css
@import "tailwindcss";
@import "tw-animate-css"; /* اگر استفاده می‌شود */

@custom-variant dark (&:is(.dark *));

html, body, #root { height: 100%; }

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

---

## 5) تنظیم `public/index.html`
```html
<!doctype html>
<html lang="fa" dir="rtl" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="/src/index.js"></script>
  </body>
</html>
```

---

## 6) راه‌اندازی shadcn و افزودن کامپوننت‌ها
```bash
npx shadcn@latest init
npx shadcn@latest add button input textarea label card dialog table checkbox
```

---

## 7) ایمپورت‌ها و JSX/JS
با `@vitejs/plugin-react` نیازی نیست حتماً `.jsx` باشد؛ ولی برای نظم بهتر، می‌توانید فایل‌های JSX را تغییر نام دهید.

مثال در `App.jsx`:
```jsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        {/* فرم و محتوا */}
      </Card>
    </div>
  )
}
```

---

## 8) اجرا و تست
```bash
npm run dev
npm run dev -- --host  # برای تست روی شبکه
```

---

## (اختیاری) Dockerfile برای build و سرو
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server {   listen 80;   server_name _;   root /usr/share/nginx/html;   location / { try_files $uri /index.html; } } ' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## چک‌لیست سریع
- [ ] Vite + alias و پلاگین tailwind  
- [ ] `jsconfig.json` برای alias  
- [ ] `index.css` تمیز و بدون `body flex`  
- [ ] `index.html` با `dir="rtl"` و مسیر `/src/index.js`  
- [ ] shadcn init + add components  
- [ ] ایمپورت‌ها با alias  
