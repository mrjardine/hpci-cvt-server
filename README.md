# HPCI PNS API Server

- API server for HPCI Push Notification Service (PNS)
- Stores Expo Push Notification tokens along with language, notification and bookmark preferences
- Sends push notifications via Expo provider


### Technical Notes

- Node.js >=16.0.0
- Express v4
- Expo Server SDK v3
- node-postgres v8.7
- node-json-db v1 (for DEV)
- Nodemon v2 (for DEV)


## Table of Contents

- [install](#install)
- [api](#api)
- [data](#data)
- [release notes](#release-notes)


## install

1. Install modules: `yarn install`

2. Add and configure .env:

````
# .env
# DEV or not DEV (e.g. production; DEV: jsondb, not DEV: postgres, PGDEV: postgres with query info logging to console)
NODE_ENV=DEV

PORT=3011

API_PATH_PREFIX=/api/v1/

EXPO_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# db connection info...
# DEV
DB_PATH_DEV=./data/db/
DB_FILE_DEV=jsonDB.json
# PG
PGUSER=apostgresuser
PGHOST=127.0.0.1
PGPASSWORD=AStrongDBPassword
PGDATABASE=hpcipns
PGPORT=5432

# config
MAX_TOKENS_TO_STORE_IN_NOTIFICATIONS_TO=10
MAX_VIEWABLE_LATEST_NOTIFICATIONS=10
MAX_WINDOW_IN_DAYS_LATEST_NOTIFICATIONS=10
````

3. Set up DEV DB:

cp ./data/db/jsonDB.initial ./data/db/jsonDB.json

4. For non-DEV, create Postgres database and update PG connection settings in .env:

See [db/index postgres script](#dbindex-postgres)

5. Start: `npm start`

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
#   set "to" to "en" or "fr" (or "all" to send pn to all devices)
#     (recommended: send both "en" and "fr" messages in same post, see last 3 examples)
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

# general pn to en and fr devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '[
    {
        "to": "en",
        "title": "Hello",
        "body": "World!",
        "data": {
            "messageType": "general",
            "link": ""
        }
    },
    {
        "to": "fr",
        "title": "Bonjour",
        "body": "Mon ami!",
        "data": {
            "messageType": "general",
            "link": ""
        }
    }
]'

# product update pn to en and fr devices
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '[
    {
        "to": "en",
        "title": "Hello",
        "body": "World!",
        "data": {
            "messageType": "productUpdate",
            "products": "16",
            "link": ""
        }
    },
    {
        "to": "fr",
        "title": "Bonjour",
        "body": "Mon ami!",
        "data": {
            "messageType": "productUpdate",
            "products": [
                "15",
                "16"
            ],
            "link": ""
        }
    }
]'

# new product pn to en and fr devices	
$ curl -H "Content-Type: application/json" -X POST "http://localhost:3011/api/v1/push/send" -d '[
    {
        "to": "en",
        "title": "Hello",
        "body": "World!",
        "data": {
            "messageType": "newProduct",
            "products": "99"
        }
    },
    {
        "to": "fr",
        "title": "Bonjour",
        "body": "Mon ami!",
        "data": {
            "messageType": "newProduct",
            "products": "99"
        }
    }
]'
````

- /api/v1/push/read/receipts

Gets receipts from Expo, processes and removes stored tickets, stores receipts. See ./notifications/expo.


**Note:** can schedule a cron task to run this endpoint daily (_recommended_).

- /api/v1/push/results

Gets most recent push notification results within last x days with toCount (pn sent to # of devices), ticketsProcessed (flag), and receiptsStatusNotOkCount (# of issues reported by provider).

- /api/v1/push/results/:notificationId

Gets full results for a push notification, along with receipt details where status is not ok.

- /api/v1/notifications/:token

Gets most recent notifications within last x days, filtered by token, preferences.


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

### db/index (postgres)

````
CREATE DATABASE "hpcipns"
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF8'
    LC_CTYPE = 'en_US.UTF8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE "hpcipns"
    IS 'database for the Push Notifications Service api';

CREATE TYPE lang_type AS ENUM ('en', 'fr');

CREATE TABLE "devices" (
    "id" SERIAL PRIMARY KEY,
    "device_id" character varying(36) NOT NULL,
    "token" character varying(50) NOT NULL,
    "language" lang_type NOT NULL DEFAULT 'en',
    "notifications" jsonb NOT NULL DEFAULT '{"enabled": false}'::jsonb,
    "bookmarks" character varying(36) ARRAY NOT NULL,
    "created" timestamptz NOT NULL DEFAULT now(),
    "updated" timestamptz
);

COMMENT ON TABLE "devices"
    IS 'registered device tokens and associated app preferences (anonymous)';

CREATE UNIQUE INDEX "devices_device_id_idx" ON "devices" ("device_id");
CREATE UNIQUE INDEX "devices_token_idx" ON "devices" ("token");

CREATE TABLE "notifications" (
    "id" SERIAL PRIMARY KEY,
    "notification_id" uuid NOT NULL,
    "to" text NOT NULL,
    "to_count" integer,
    "language" lang_type NOT NULL,
    "title" character varying(256) NOT NULL,
    "body" character varying(2048) NOT NULL,
    "data" jsonb,
    "created" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "notifications"
    IS 'push notifications sent to registered devices';

CREATE INDEX "notifications_notification_id_idx" ON "notifications" ("notification_id");

CREATE TABLE "tickets" (
    "id" SERIAL PRIMARY KEY,
    "ticket_id" uuid NOT NULL,
    "status" text,
    "expo_token" character varying(50),
    "message" text,
    "details" jsonb,
    "receipt_id" uuid NOT NULL,
    "notification_ids" uuid ARRAY NOT NULL,
    "created" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "tickets"
    IS 'tickets received from Expo when sending push notifications';

CREATE INDEX "tickets_receipt_id_idx" ON "tickets" ("receipt_id");
CREATE INDEX "tickets_notification_ids_idx" ON "tickets" USING GIN ("notification_ids" array_ops);

CREATE TABLE "receipts" (
    "id" SERIAL PRIMARY KEY,
    "receipt_id" uuid NOT NULL,
    "receipt" jsonb,
    "notification_ids" uuid ARRAY NOT NULL,
    "created" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "receipts"
    IS 'receipts received from Expo';

CREATE INDEX "receipts_receipt_id_idx" ON "receipts" ("receipt_id");
CREATE INDEX "receipts_notification_ids_idx" ON "receipts" USING GIN ("notification_ids" array_ops);
````

## release notes

## HPCI PNS API Server - Update 0.0.4

### **Steps to upgrade to 0.0.4** (from 0.0.3)

#### 1. Reset the hpcipns Postgres database:
- drop the database
````
DROP DATABASE "hpcipns";
````
- run the [db/index postgres script](#dbindex-postgres)

#### 2. Pull latest from origin/main and check files:
````
yarn --checkFiles
````

#### 3. Start:
````
npm start
````

#### 4. Ensure /devices/* and /notifications/* _are the **only** public endpoints_


**Note:** .env has no new changes.


---
### May 16, 2022; version: 0.0.4

- added endpoints for reviewing push results
- optimized notifications queries
- deleted device on post when notifications.enabled is false
- see [upgrade steps](#steps-to-upgrade-to-004-from-003)

### March 2, 2022; version: 0.0.3

- added postgres
- added receipts, extra fields for notifications and tickets
- added Expo access security token

### January 10, 2022; version: 0.0.2

- added notifcations settings and message type
- added endpoint to get latest notifications for device
- added bookmarks

### August 12, 2022; version: 0.0.1

- initial commit

