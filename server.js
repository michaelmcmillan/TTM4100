var log = require('./log.js');
var net = require('net');
var jsonStream = require('JSONStream');

function Server (host, port) {
    
    var host = host || '127.0.0.1';
    var port = port || 1337;
    var socket;
    var self = this; 
    var history = [];

    this.observers = {
        onMessage: [],
        onConnect: []
    }    

    this.clients = {
        authorized:   [],
        unauthorized: []
    }

    var supportedCommands = [
        'login', 'logout', 'msg',
        'names', 'help'    
    ];
    
    this.commandRequiresArgument = function (command) {
        return (command === 'login' || command === 'msg');
    }

    this.parse = function (input) {
        try {
            input = JSON.parse(input);
        } catch (e) {
            throw new Error('Ugyldig format på meldingen.');
        }

        var command = input.request; 
        var content = input.content; 
        
        if (content === '') content = null;

        if (supportedCommands.indexOf(command) === -1)
            throw new Error('Ugyldig kommando: ' + command);
         
        if (this.commandRequiresArgument(command)
        &&  content === '')
            throw new Error('Mangler argument.');

        if (this.commandRequiresArgument(command) === false
        &&  content != null)
            throw new Error('Ulovlig argument.');

        if (command === 'login' && !this.validNickname(content))
            throw new Error('Ulovlig navn.');
        
        return {
            request: command,
            content: content
        }
    }

    this.validNickname = function (nickname) {
        return nickname.match(/^[a-z0-9]+$/i); 
    }

    this.constructPayload = function (response, content, sender, timestamp) {
        var nickname; 

        if (typeof sender === 'string')
            nickname = sender;    

        if (sender.nickname !== undefined) 
            nickname = sender.nickname;

        var payload = {
            response: response,
            content: content,
            timestamp: timestamp,
            sender: nickname 
        }

        return JSON.stringify(payload, null, 4); 
    }
    
    this.deconstructPayload = function (payload) {
        return JSON.parse(payload); 
    }

    this.isAuthorized = function (client) {
        return (this.clients.authorized.indexOf(client) !== -1);
    }    
    
    this.authorize = function (client) {
        var index = this.clients.unauthorized.indexOf(client);             
        this.clients.unauthorized.pop();
        this.clients.authorized.push(client);
        this.sendHistory(client);
        log('info', client.nickname + ' is now in the chat.');
    }
    
    this.sendHistory = function (client) {
        history.forEach(function(message) {
            self.send('history', message[0], message[1], message[2], client);
        });
    }

    this.broadcast = function (response, content, sender, timestamp, done) {
        history.push([content, sender.nickname, timestamp]);
        log('info', sender.nickname + ': ' + content);
        self.clients.authorized.forEach(function (authorizedClient) {
            if (authorizedClient.nickname !== sender.nickname)
                self.send(response, content, sender, timestamp, authorizedClient);
        });
    }
    
    this.send = function (response, content, sender, timestamp, client, done) {
        var payload = this.constructPayload(response, content, sender, timestamp); 
        var self = this;
        try {
            if (client.writable)
                client.write(payload + '\n', done);
            else
                self.destroyClient(client);
        } catch (error) {
           log('error', 'Client is dead.'); 
        }
    }    
    
    this.destroyClient = function (client) {
        var self = this; 

        var userPool = self.isAuthorized(client) ? self.clients.authorized : self.clients.unauthorized;
        userPool.splice(userPool.indexOf(client), 1);

        if (client.nickname !== undefined) 
            log('error', client.nickname + ' disconnected.');
        else if (client.destroyed === false)
            log('error', client.ip + ' disconnected.');

        client.destroy();
    }

    this.onMessage = function (input, client) {
        // Validate input from client        
        try {
            var parsedInput = self.parse(input.toString());
        } catch (error) {
            self.send('error', error.message, 'server', new Date(), client);
            return;
        }
        
        // Respond with help text on 'help' 
        if (parsedInput.request === 'help')
            return self.send('info', 'You are on your own.', 'server', new Date(), client);
    
        // Disconnect client upon 'logout'        
        if (parsedInput.request === 'logout')
            return self.destroyClient(client);
        

        /* Not authorized */
        if (self.isAuthorized(client) === false) {
            
            // Illegal commands when not authorized
            if (parsedInput.request === 'names'
            ||  parsedInput.request === 'msg')
                self.send('error', 'Illegal command, you are not authorized.', 'server', new Date(), client);

            // Authorize client and provide history on valid nickname
            if (parsedInput.request === 'login') {
                
                // Check that the nickname is not taken
                if (self.getAuthorizedNicknames().indexOf(parsedInput.content) === -1) {
                    client.nickname = parsedInput.content;
                    self.authorize(client);
                    self.send('info', 'Welcome to the chat ' + client.nickname + '!', 'server', new Date(), client);
                } else {
                    self.send('error', 'That username is taken.', 'server', new Date(), client);
                }
            }
        }

        /* Authorized */
        else {

            // Respond with clients on 'names' 
            if (parsedInput.request === 'names')
                return self.send('info', self.getAuthorizedNicknames(), 'server', new Date(), client);
            
            // Broadcast message
            if (parsedInput.request === 'msg')
                return self.broadcast('message', parsedInput.content, client, new Date());
        }
    }    
    
    this.getAuthorizedNicknames = function () {
        var self = this;
        var nicknames = [];
        self.clients.authorized.forEach(function (authorizedClient) {
            nicknames.push(authorizedClient.nickname);
        });
        return nicknames;
    }
    
    this.listen = function (done) {
        var self = this;

        socket = net.createServer(function (client) {
            client.ip = client.remoteAddress;  

            log('success', client.ip + ' connected.');

            self.clients.unauthorized.push(client);
            self.observers.onConnect.forEach(function (observer) {
                observer();
            });  
            
            var parser = jsonStream.parse();
            client.pipe(parser).on('error', function () {
                self.send('error', 'Wrong data format. Must be valid JSON.', 'server', new Date(), client);
                self.destroyClient(client);
            });
            
            parser.on('root', function (message) {
                self.onMessage(JSON.stringify(message), client); 
                self.observers.onMessage.forEach(function (observer) {
                    observer(JSON.stringify(message));
                });  
            });

            client.on('end', function () {
                self.destroyClient(client);
            });
        });

        socket.listen(port, function () {
             done();
        });
    }

    this.shutdown = function (done) {
        socket.close(function () {
            done();
        });
    }
}

/* Main */
if (process.argv[2] !== undefined) {
    var server = new Server(process.argv[2], process.argv[3]);
    log('info', 'Booting up this bad boy.');
    server.listen(function () {
        log('success', 'Listening on ' +  process.argv[3] + '!'); 
    });
}

module.exports = Server;
