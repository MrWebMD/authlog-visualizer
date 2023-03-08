FROM node:16.13.2
ENV NODE_ENV=production
WORKDIR /app
RUN chown -R node:node /app
USER node
COPY package.json .
RUN npm install
COPY . ./
EXPOSE 3011
CMD ["npm", "start"]