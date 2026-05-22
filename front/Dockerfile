# ─────────────────────────────────────────────────────────────
# JudaPay Front — Vite 빌드 후 산출물만 추출
# nginx 컨테이너가 같은 볼륨을 읽어 정적 파일로 서빙한다.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# package-lock.json 캐시 활용
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite 빌드 시점에는 same-origin( /api ) 으로 호출 → 별도 API_BASE 불필요
# (배포 시 nginx 가 /api 를 server 로 proxy)
RUN npm run build

# 빌드 결과(/app/dist)를 볼륨에 옮길 작은 alpine 이미지
FROM alpine:3.19
WORKDIR /dist
COPY --from=builder /app/dist /tmp/dist
# 컨테이너 시작 시 /tmp/dist 를 /dist (volume) 로 복사 후 종료
CMD sh -c "cp -r /tmp/dist/. /dist/ && echo 'front built → /dist'"
