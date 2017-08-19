#!/usr/bin/env bash

yarn link

cd ../weplay
yarn link weplay-common

cd ../weplay-babel
yarn link weplay-common

cd ../weplay-compressor
yarn link weplay-common

cd ../weplay-emulator
yarn link weplay-common

cd ../weplay-presence
yarn link weplay-common

cd ../weplay-web
yarn link weplay-common

cd ../weplay-discovery
yarn link weplay-common

cd ../weplay-relay
yarn link weplay-common

cd ../weplay-discovery
yarn link weplay-common

cd ../weplay-rom
yarn link weplay-common
