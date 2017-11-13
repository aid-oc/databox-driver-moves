FROM node:alpine

ADD . .
RUN npm install

LABEL databox.type="driver"

EXPOSE 3000

CMD ["npm","start"]
