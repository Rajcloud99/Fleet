# README #

This README would normally document whatever steps are necessary to get your application up and running.

### What is this repository for? ###

* Quick summary
* Version
* [Learn Markdown](https://bitbucket.org/tutorials/markdowndemo)

### How do I get set up? ###

* Summary of set up
* Configuration
* Dependencies
* Database configuration
* How to run tests
* Deployment instructions

### Contribution guidelines ###

* Writing tests
* Code review
* Other guidelines

### Who do I talk to? ###

* Repo owner or admin kamal mewada
* Other community or team contact
=======
TrackLabs Backend
=================

Please use `npm install` after cloning.

## Software Requirements

- [NodeJS server](https://nodejs.org/)
- [MongoDB installation](https://www.mongodb.org/)

Make sure `npm` is also installed along with node.

**Please add if any other steps necessary in setup**

## Setup

- Clone repository
- Run `npm install`
- Create an empty folder called `db/` in project root
- Run MongoDB server with `mongod --dbpath ./db`
- Open Mongo client with `mongo` and create database `dbTest`
- Create collection `users`
- Start node server with `nodemon` (if you have it) or `npm start`. Make sure the db server is running before this, otherwise the node server will crash.
- import city database from a csv file in test folder
-use below command to import csv file. Replace path for csv file as for loaction of csv file
- "mongoimport -d dbTest -c cities --type csv --file /home/kamal/git/node-server/test/cityDb.csv --headerline"

## API

See [API.md](https://bitbucket.org/kamal083/node-server/src/user-mgmt/API.md?at=user-mgmt).

----

## Modules used

- `bcrypt` for password hashing
- `bluebird` for Promises
- `mongoose` for MongoDB schema-based management
- `passport` and `passport-jwt` for authentication and JWT use
- `passport-local` for username-password login system
- `validator` for server-side data validation
- `winston` for logging

## Current status

- User registration with basic user model complete
- User login verification complete
- Manual testing complete, Promise-related bugs fixed
- Migration of login system to `passport-local`
- Persistent login with `node-jwt-simple` (note that I am not planning on using `passport-jwt` at the moment because of unnecessary complexity)
- Reset password implemented

## Next steps

- `[DONE]` Migration of login system to `passport-local`
- `[DONE]` Persistent login with `node-jwt-simple` (note that I am not planning on using `passport-jwt` at the moment because of unnecessary complexity)
- User model changes to reflect application
- Introduce a testing framework
- Discuss functionality of application and introduce actual restricted routes requiring JWT access
- Frontend integration and API standardization
- HTTPS security


************************************************************************************************
##icd city import example
 mongoimport -d lmsDB -c cities --type csv --file city.csv --headerline

******************************************************************************************************************************

### Steps to Upload Documents ###
* Add imports, connect-multiplarty, and call function fileUpload. Refer driverController.js
