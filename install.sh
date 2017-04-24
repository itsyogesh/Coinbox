#!/bin/bash

GREEN='\033[0;32m'
NOCOLOR='\033[0m'

echo -e "${GREEN}Installing global dependencies ${NOCOLOR}"
npm install -g eslint yarn

echo -e "${GREEN}Installing frontend dependencies ${NOCOLOR}"
cd app && yarn install

echo -e "${GREEN}Going back to parent directory ${NOCOLOR}"
cd ..

echo -e "\n${GREEN}Installing backend dependencies ${NOCOLOR}"
cd server && npm install
