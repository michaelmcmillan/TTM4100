# TTM4100 [![Build Status](https://travis-ci.org/michaelmcmillan/TTM4100.svg)](https://travis-ci.org/michaelmcmillan/TTM4100)
Chat protocol with client and server in Javascript. 

### Install
````bash
git clone git@github.com:michaelmcmillan/TTM4100.git
cd TTM4100
npm install
````

### Run

#### Client
````bash
node client <ip> <port>
````

#### Server
````bash
node server <ip> <port>
````

### Test
The test suite consist of tests that verifies the entire implementation (unit and integration tests of client and server). Run them by typing:

````bash
npm test
````

### Commands
The server supports the following commands.

| Command | Argument | Description |
| ------- | -------- | ----------- | 
| login   | nickname: Alphanumerical string.    | Logs in to the server with the provided nickname. |
| help   | none  | Displays help text. |
| msg   | message: Any string.  | Sends a message to the other authenticated clients. |
| names   | none  | Returns a list of nicknames for all the authenticated clients. |
| logout   | none  | Kills the socket and disconnects the client. |
