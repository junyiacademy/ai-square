# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy service account key if it exists in the project root
# Note: In production, this should be mounted as a secret or provided via environment variable
COPY --from=builder /app/ai-square-key.json* ./

# Set the environment variable for Google Auth
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/ai-square-key.json

EXPOSE 3000
CMD ["npm", "start"] 