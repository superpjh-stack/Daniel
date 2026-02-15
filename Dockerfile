# 로컬 빌드 결과물을 패키징하는 Dockerfile
# 사용 전: npm ci && npx prisma generate && npm run build
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 로컬 빌드 결과물 복사
COPY public ./public
COPY .next/standalone ./
COPY .next/static ./.next/static

# serverExternalPackages로 지정된 모듈은 standalone에 포함되지 않으므로 별도 복사
COPY node_modules/.prisma ./node_modules/.prisma
COPY node_modules/@prisma/client ./node_modules/@prisma/client
COPY node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY node_modules/@prisma/client-runtime-utils ./node_modules/@prisma/client-runtime-utils
COPY node_modules/@prisma/driver-adapter-utils ./node_modules/@prisma/driver-adapter-utils
COPY node_modules/@prisma/debug ./node_modules/@prisma/debug

# Turbopack이 해시된 이름으로 외부 모듈을 참조 - 심링크로 해결
RUN node -e " \
  const fs=require('fs'), path=require('path'); \
  const dir='.next/server/chunks'; \
  const seen=new Set(); \
  fs.readdirSync(dir).filter(f=>f.endsWith('.js')).forEach(f=>{ \
    const c=fs.readFileSync(path.join(dir,f),'utf8'); \
    for(const m of c.matchAll(/\"(@prisma\/[a-z-]+)-([a-f0-9]{16})\"/g)){ \
      const key=m[1]+'-'+m[2]; if(seen.has(key))continue; seen.add(key); \
      try{fs.symlinkSync('/app/node_modules/'+m[1],'/app/node_modules/'+m[1]+'-'+m[2]);console.log('symlink:',key)}catch(e){} \
    } \
    for(const m of c.matchAll(/\"(pg)-([a-f0-9]{16})\"/g)){ \
      const key=m[1]+'-'+m[2]; if(seen.has(key))continue; seen.add(key); \
      try{fs.symlinkSync('/app/node_modules/'+m[1],'/app/node_modules/'+m[1]+'-'+m[2]);console.log('symlink:',key)}catch(e){} \
    } \
  });"

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
