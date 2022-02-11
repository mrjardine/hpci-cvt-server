# HPCI PNS API Server

- API server for HPCI PNS
- Stores Expo Push Notification tokens along with language, notification and bookmark preferences
- Sends push notifications via Expo provider


### Technical Notes

- Node.js v14.15.5
- Express v4
- Expo Server SDK v3
- Nodemon v2 (for DEV)
- node-json-db: v1  (for DEV)


## Table of Contents

- [install](#install)
- [api](#api)
- [data](#data)
- [release notes](#release-notes)
- [TODO](#TODO)


## install

1. Install modules: `yarn install`

2. Add .env:

````
# .env
# DEV
NODE_ENV=DEV

PORT=3011

API_PATH_PREFIX=/api/v1/

# db connection info...
DB_PATH_DEV=./data/db/
DB_FILE_DEV=jsonDB.json

# config
MAX_TOKENS_TO_STORE_IN_NOTIFICATIONS_TO=10
MAX_VIEWABLE_LATEST_NOTIFICATIONS=10
MAX_WINDOW_IN_DAYS_LATEST_NOTIFICATIONS=10
````

3. Set up DEV DB:

cp ./data/db/jsonDB.initial ./data/db/jsonDB.json

4. Start: `npm start`

If needed:

yarn add -D nodemon

yarn add -D dotenv


## api

### version: v1 (current)

````
$ curl http://localhost:3011/api/v1/alive
````

### devices crud

get examples:

````
$ curl http://localhost:3011/api/v1/devices/count
$ curl http://localhost:3011/api/v1/devices/count/en
$ curl http://localhost:3011/api/v1/devices/count/fr
$ curl http://localhost:3011/api/v1/devices/reload
````

other route paths:
1. /api/v1/devices/:token
2. /api/v1/devices/:token.:language

supports:
1. get, post, delete
2. get, post

post, delete examples:

````
$ curl -X POST "http://localhost:3011/api/v1/devices/xxxxxxxxxxxxxxxxxxxxxx"
$ curl -X POST "http://localhost:3011/api/v1/devices/xxxxxxxxxxxxxxxxxxxxxx.en"
$ curl -X POST "http://localhost:3011/api/v1/devices/xxxxxxxxxxxxxxxxxxxxxx.fr"
$ curl -X DELETE "http://localhost:3011/api/v1/devices/xxxxxxxxxxxxxxxxxxxxxx"

# post body [optional] example (with defaults shown):
{
  "data": {
    "bookmarks": [],
    "language": "en",
    "notifications": {
        "enabled": true,
        "newProducts": true,
        "bookmarkedProducts": true
    }
  }
}
````

### notifications

- /api/v1/push/send

examples:

````
# notes:
#   set "to" to "en" or "fr", or "all" to send pn to all devices
#     (recommended: send both "en" and "fr" messages in same post)
#   set "messageType" to "general", "newProduct" or "productUpdate"
#     (default: "general"; specify product nid(s) for "productUpdate", product nid for "newProduct")

# post data [optional] example:
{
  "data": {
    "products": "16",
    "link": "https://covid-vaccine.canada.ca/comirnaty/product-details",
    "messageType": "productUpdate"
  }
}

# general pn to one device
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title":"hello",
  "body": "world"
}'

# general pn to all devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '{
  "to": "all",
  "title":"hello",
  "body": "world"
}'

# general pn to all devices with an en preference
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '{
  "to": "en",
  "title":"hello",
  "body": "world"
}'

# product update pn to one device
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title":"hello",
  "body": "world",
  "data": { "products": ["15", "16"], "messageType": "productUpdate" }
}'

# general pn to specific devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '{
  "to": [
    "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
  ],
  "title":"hello",
  "body": "world",
  "sound": "default",
  "badge": 1
}'

# two messages, general pn to one device, product update pn to specific devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '[
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title":"hello",
  "body": "world"
},{
  "to": [
    "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]",
    "ExponentPushToken[zzzzzzzzzzzzzzzzzzzzzz]"
  ],
  "title":"Hello",
  "body": "World!",
  "data": { "products": "1", "messageType": "productUpdate" }
}
]'

# three messages: general pn to all devices, product update pns to en and fr devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '[
{
  "to": "all",
  "title":"hello",
  "body": "world"
},{
  "to": "en",
  "title":"Hello",
  "body": "World!",
  "data": { "products": ["15", "16"], "messageType": "productUpdate" }
},{
  "to": "fr",
  "title":"Bonjour",
  "body": "Mon ami!",
  "data": { "products": "16", "messageType": "productUpdate" }
}
]'
````

- /api/v1/push/read/receipts

Gets receipts from Expo, processes and removes stored tickets, stores receipts. See ./notifications/expo.
Note: can schedule a cron task to run this endpoint daily (recommended).

- /api/v1/notifications/:token

Gets most recent notifications within last x days.


## data

### db/jsonDB

````
{
    "devices": {
        "xxxxxxxxxxxxxxxxxxxxxx": {
            "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
            "language": "en",
            "notifications": {
                "enabled": true,
                "newProducts": true,
                "bookmarkedProducts": true
            },
            "bookmarks": [
              "15"
            ],
            "updated": "2021-08-11T15:01:27Z"
        }
    },
    "notifications": {
        "94b68fd5-eac0-43fe-b13d-44b0273ab042": {,
            "notificationId": "d08130f5-e98b-4228-92db-230daf512f12",
            "to": "en",
            "toCount": 1,
            "language": "en",
            "title": "Hello",
            "body": "World!",
            "data": {
                "products": [
                    "15",
                    "16"
                ],
                "messageType": "productUpdate",
                "link": ""
            },
            "created": "2021-09-08T17:22:22Z"
        }
    },
    "receipts": {},
    "tickets": {}
}
````

## release notes

HPCI CVT API Server

### version: 0.0.2 (current)

- added notifcations settings and message type

### version: 0.0.1

- initial commit


## TODO

- set up and send Expo 'security token'
- complete handling of errors from Expo
- db implementation for prod
