# ============================
# backend/Dockerfile
# ============================

# Multi-stage اختیاری نیست، ولی تصویر را کوچک و امن می‌کند
FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
# RUN npm ci --only=production
# اگر از npm v10 استفاده می‌شود:
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
# tini برای هندل صحیح سیگنال‌ها در کانتینر
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://localhost:5000/healthz').then(r=>{if(r.ok)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node","server.js"]