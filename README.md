# HPCI CVT API Server

- API server for HPCI CVT
- Stores Expo Push Notification tokens along with language and bookmark preferences
- Sends push notifications via Expo provider
- Work in progress


### Technical Notes

- Node.js v14.15.5
- Express v4
- Nodemon v2
- Expo Server SDK v3
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

# post body [optional] example:
{
  "data": {
    "bookmarks": [
      15,
      16
    ],
    "language": "fr"
  }
}
````

### notifications

- /api/v1/push/send

examples:

````
# note:
#   set "to" to "all", "en" or "fr" to send pn to all devices, or specifically to those with en or fr preference

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

# product specific pn to one device
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title":"hello",
  "body": "world",
  "data": { "products": [15, 16] }
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

# two messages, general pn to one device, product specific pn to specific devices
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
  "data": { "products": 1 }
}
]'

# three messages: general pn to all devices, product specific pns to en and fr devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '[
{
  "to": "all",
  "title":"hello",
  "body": "world"
},{
  "to": "en",
  "title":"Hello",
  "body": "World!",
  "data": { "products": [15, 16] }
},{
  "to": "fr",
  "title":"Bonjour",
  "body": "Mon ami!",
  "data": { "products": 16 }
}
]'
````

- /api/v1/push/read/receipts

Gets receipts from Expo, processes and removes stored tickets. See ./notifications/expo.
Note: can schedule a cron task to run this endpoint daily.

- /api/v1/notifications/:token/:language/:date

Gets most recent notifications within last x days on or after :date.
Note: if :token has stored bookmarks, non-related product notifications will be filtered out.


## data

### db/jsonDB

````
{
    "devices": {
        "xxxxxxxxxxxxxxxxxxxxxx": {
            "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
            "language": "en",
            "bookmarks": [
              15
            ],
            "updated": "2021-08-11T15:01:27Z"
        }
    },
    "notifications": {
        "94b68fd5-eac0-43fe-b13d-44b0273ab042": {
            "to": "en",
            "language": "en",
            "title": "Hello",
            "body": "World!",
            "data": {
                "products": [
                    15,
                    16
                ]
            },
            "created": "2021-09-08T17:22:22Z"
        }
    },
    "tickets": {}
}
````

## release notes

### version: 0.0.1 (current)

HPCI CVT API Server

- initial commit


## TODO

- set up and send Expo 'security token'
- complete handling of errors from Expo
- get/pull notifications, filter for bookmarks
- db implementation for prod
