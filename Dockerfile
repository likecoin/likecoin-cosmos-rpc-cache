FROM node:16
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install
ADD . /app
ENV NODE_ENV production
ENV HOST 0.0.0.0
EXPOSE 8080
USER 1000
CMD npm start
