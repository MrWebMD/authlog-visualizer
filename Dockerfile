FROM node:16.13.2
ENV NODE_ENV=production
WORKDIR /app
COPY package.json .
RUN npm install
COPY . ./
RUN chown -R node:node /app
USER node
EXPOSE 80
CMD ["npm", "start"]