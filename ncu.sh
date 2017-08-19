#!/usr/bin/env bash


cd ../weplay
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-babel
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-compressor
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-emulator
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-presence
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-web
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-discovery
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-relay
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-discovery
ncu -u --loglevel verbose --packageFile package.json

cd ../weplay-rom
ncu -u --loglevel verbose --packageFile package.json
