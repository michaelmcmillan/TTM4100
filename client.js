var log = require('./log.js');
var net = require('net');
var jsonStream = require('JSONStream');

function Client (host, port) {

    var host = host || '127.0.0.1';
    var port = port || 1337;
    var socket;
    this.server;

    this.observers = {
        onMessage: [],
        onConnect: []
    }    
    
    var supportedCommands = [
        'login', 'logout', 'msg',
        'names', 'help'    
    ];
    
    this.commandRequiresArgument = function (command) {
        return (command === 'login' || command === 'msg');
    }

    this.parse = function (input) {
        var command = input.split(' ')[0];
        var delimiterPosition = command.length + 1;
        var content = input.substring(delimiterPosition, input.length) || '';

        if (supportedCommands.indexOf(command) === -1)
            throw new Error('Ugyldig kommando.');

        if (this.commandRequiresArgument(command)
        &&  content === '')
            throw new Error('Mangler argument.');
        
        if (this.commandRequiresArgument(command) === false)
            return this.constructPayload(command, null);
        else
            return this.constructPayload(command, content);
    }

    this.constructPayload = function (command, content) {
        var payload = {
            request: command,
            content: content
        }
        return JSON.stringify(payload); 
    }

    this.deconstructPayload = function (payload) {
        return JSON.parse(payload); 
    }

    this.connect = function (done) {
        var self = this;

        socket = new net.Socket();
        socket.connect(port, host, function(server) {
            done();
            
            var parser = jsonStream.parse();
            socket.pipe(parser);

            parser.on('root', function (message) {
                self.observers.onMessage.forEach(function (observer) {
                    observer(message);
                });
            });
        }); 
    }

    this.send = function (input, done) {
        var payload = this.parse(input);
        socket.write(payload, done);    
    }

    this.disconnect = function (done) {
        var self = this;
    }
}

/* Main */
var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

if (process.argv[2] !== undefined) {
    var client = new Client(process.argv[2], process.argv[3]);
    client.connect(function () {
        log('success', 'Connected to ' + process.argv[2]); 
    
        client.observers.onMessage.push(function (message) {
            if (message.response === 'error')
                log('error', message.sender + ': ' + message.content, message.timestamp); 
            else if (message.response === 'history')
                log('history', message.sender + ' wrote: ' + message.content, message.timestamp);
            else if (message.response === 'message')
                log('info', message.sender + ': ' + message.content, message.timestamp); 
            else
                log('info', message.content, message.timestamp); 
        });
        
        rl.on('line', function (line) {
            try {
                client.send(line);        
            } catch (error) {
                log('error', error.message);
            }

            if (line === 'logout') process.exit();
        })
    });
}

module.exports = Client;
