# WebPhim

WebPhim consists of a Spring Boot 4 / MongoDB backend and a React 19 / Vite
frontend.

## Local development

Requirements: Java 21, Node.js 20+, Docker with Compose.

```bash
docker compose -f docker-compose.dev.yml up -d --wait mongo

cd BEPhim
./mvnw spring-boot:run

cd ../fe
npm ci
npm run dev
```

The MongoDB container is a single-node replica set because account changes and
mail outbox inserts use transactions.

When SMTP is enabled, set `APP_MAIL_OUTBOX_ENCRYPTION_KEY` to a Base64-encoded
32-byte key, for example:

```bash
openssl rand -base64 32
```

Do not rotate that key until all pending outbox messages have been delivered
or migrated.

## Verification

```bash
cd BEPhim && ./mvnw clean verify
cd ../fe && npm run lint && npm test && npm run build && npm run audit:ci
```

Jenkins expects an OSS Index username/password credential named
`oss-index-api`; the password value is the OSS Index API token.
