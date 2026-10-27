# Front de control de calidad: build de TanStack Start servido con srvx.
#
#   docker build \
#     --build-arg VITE_API_URL=https://api.ejemplo.com \
#     --build-arg VITE_REPORT_SERVICE_URL=https://reportes.ejemplo.com \
#     -t control-calidad-front .
#   docker run -d -p 3000:3000 --restart unless-stopped control-calidad-front
#
# Las VITE_* se fijan al compilar: cambiar la URL del backend es volver a
# construir la imagen, no reiniciar el contenedor.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_REPORT_SERVICE_URL
ENV VITE_API_URL=$VITE_API_URL \
    VITE_REPORT_SERVICE_URL=$VITE_REPORT_SERVICE_URL

RUN npm run build


FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# El bundle del servidor importa react, @tanstack/*, three... desde node_modules.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force \
    && npm install -g srvx@1.0.8

COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# server.js sólo exporta un handler fetch; srvx lo escucha y sirve dist/client.
CMD ["srvx", "--prod", "-s", "../client", "dist/server/server.js"]
