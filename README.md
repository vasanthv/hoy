# Hoy

Send push notifications to friends with just a push of a button. Hoy **does not use** Firebase Cloud Messaging (FCM) for handling push notifications.

---

### Prerequisites:

- Node.js 16.x or above
- NPM

### How to Build this app locally

[Fork this repo](https://github.com/vasanthv/hoy/fork) and then clone it:

```bash
git clone https://github.com/<your_name>/hoy.git
```

`cd hoy` and then install dependencies

```bash
npm install
```

### Generate Vapid Keys for push notifications.

For sending push notifications to browsers you need a pair (private & public) of vapid keys. Use `npm run gen:vapid` to generate the vapid keys. Update the keys in the `server/config.js` to pass them as environment variables to the node process.

### Run the app

```bash
npm start
```

to start the hoy server. Your hoy instance will be running on http://localhost:80 (or just http://localhost).

### LICENSE

<a href="https://github.com/vasanthv/hoy/blob/master/LICENSE">MIT License</a>
