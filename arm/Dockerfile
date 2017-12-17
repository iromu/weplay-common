FROM arm32v7/node:9

# Install app dependencies
RUN npm -g i yarn

# Create app directory
RUN mkdir -p /usr/src/app/common
WORKDIR /usr/src/app/common

COPY ../ .

RUN yarn
RUN yarn link

RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
