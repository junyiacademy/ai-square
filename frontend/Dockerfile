# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Generate Prisma client
RUN npx prisma generate
RUN npm run build

# 2. Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy src directory for SQL schema files
COPY --from=builder /app/src ./src
# Copy prisma directory for migrations
COPY --from=builder /app/prisma ./prisma

# Copy service account key if it exists in the project root  
# B Solution: Use GitHub secrets for Vertex AI authentication
COPY --from=builder /app/vertex-ai-key.json* ./

# Set the environment variable for Google Auth
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/vertex-ai-key.json

EXPOSE 3000
CMD ["npm", "start"] 