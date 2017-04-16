# Coinbox - A bitcoin wallet

### Getting started

The app is divided into two distinct parts. The `app` folder represents the frontend code written in React whereas the `server` folder represents a thin wrapper over (bitcore-wallet-client)[https://github.com/bitpay/bitcore-wallet-client] with user authentication and additional functionalities.

To get started, clone the app:
```
git clone https://github.com/itsyogesh/Coinbox
cd Coinbox
```

Next, install the required dependencies for both frontend and backend.

To make things easier I've added an `install.sh` file that installs the required dependencies.
```
chmod 700 install.sh
./install.sh
```

You can also install everything manually. If you don't have yarn, you can add it with the command `npm install -g yarn`
```
cd app && yarn install
cd ..
cd server && npm install
```
