FROM node:8

# Create app directory
RUN mkdir -p /usr/src/app/common
WORKDIR /usr/src/app/common

# Install app dependencies
RUN npm -g i yarn

COPY . .

RUN yarn --production

RUN yarn link

RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
