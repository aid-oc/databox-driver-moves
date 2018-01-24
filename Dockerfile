FROM node:alpine

RUN apk add --update make gcc g++ python curl git krb5-dev zeromq-dev && \
npm install zeromq --zmq-external --save && \
apk del make gcc g++ python curl git krb5-dev

ADD . .
RUN npm install

LABEL databox.type="driver"

EXPOSE 8080

CMD ["npm","start"]