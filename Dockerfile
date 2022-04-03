FROM node:16

VOLUME /cache
ENV CACHE_DIR=/cache

WORKDIR /app
COPY package.json package-lock.json index.js ./
RUN npm install

EXPOSE 3000
CMD [ "node", "index.js" ]
