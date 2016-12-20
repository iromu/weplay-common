#!/usr/bin/env bash

npm link

cd ../weplay
npm link weplay-common

cd ../weplay-babel
npm link weplay-common

cd ../weplay-compressor
npm link weplay-common

cd ../weplay-emulator

cd ../weplay-presence
npm link weplay-common

cd ../weplay-web
npm link weplay-common

cd ../weplay-discovery
npm link weplay-common

cd ../weplay-relay
npm link weplay-common