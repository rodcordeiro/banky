FROM node:18 AS builder

WORKDIR /banky

COPY . .

RUN yarn

RUN yarn build

EXPOSE 80

CMD [ "yarn", "start:prod" ]
