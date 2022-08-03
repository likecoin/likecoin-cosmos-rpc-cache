FROM node:16
ENV NODE_ENV production
ENV HOST 0.0.0.0
EXPOSE 8080
CMD npm start
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install
USER 1000
ADD . /app
