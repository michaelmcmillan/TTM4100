var assert = require('assert');
var net    = require('net');
var Server = require('../server.js');
var Client = require('../client.js');


describe('Integration', function () {
    describe('socket', function () {

        it('should open a socket when starting server', function (done) {
            var server = new Server();    
            server.listen(function () {
                server.shutdown(done);
            });
        });

        xit('should open a socket when starting client', function (done) {
            var client = new Client();    
            var server = new Server();    
            server.listen(function () {
                client.connect(function () {
                    server.shutdown(done);
                });
            });
        });
        
        it('should mark client as unauthorized after it connects', function (done) {
            var server = new Server();    
            var client = new Client();    
            
            server.listen(function () {
                client.connect(function () {
                    
                });
            });

            server.observers.onConnect.push(function () {
                assert.equal(server.clients.unauthorized.length, 1);
                assert.equal(server.clients.authorized.length, 0);
                server.shutdown();
                done();
            });

        });
        
        it('should mark client as authorized after valid supplying nick', function (done) {
            var server = new Server();    
            var client = new Client();    
            
            server.listen(function () {
                client.connect(function () {
                    client.send('login mike');            
                });
            });

            server.observers.onMessage.push(function (message) {
                assert.equal(server.clients.unauthorized.length, 0);
                assert.equal(server.clients.authorized.length, 1);
                server.shutdown();
                done();
            });
        });
    });

    describe('commands', function () {    
        it('should respond with help if requested from client', function (done) {
            var server = new Server();    
            var client = new Client();    
            
            server.listen(function () {
                client.connect(function () {
                    client.send('help');            
                });
            });
        
            client.observers.onMessage.push(function (message) {
                assert.equal(message.response, 'info')
                done();
            });        
    
            server.observers.onMessage.push(function (message) {
                server.shutdown();
            });
        });

        it('should send list of names upon request from client', function (done) {
            var server = new Server();    
            var mike   = new Client();    
            var thor   = new Client();    
            var connectedClients = 0;

            server.listen(function () {
                mike.connect(function () {
                    mike.send('login mike');            
                });

                thor.connect(function () {
                    thor.send('login thor');            
                });
            });

            server.observers.onMessage.push(function () {
                if (++connectedClients === 2) {
                    assert.equal(server.clients.authorized.length, 2);
                    mike.send('names');
                } 
            });
            
            var messages = 0;
            mike.observers.onMessage.push(function (msg) {
                if (++messages === 2) {
                    assert.equal(msg.content.indexOf('thor') !== -1, true);
                    assert.equal(msg.content.indexOf('mike') !== -1, true);

                    server.shutdown();
                    done();
                }
            });            
        });

        it('should broadcast messages to other clients when sender is authorized', function (done) {
            var server = new Server();    
            var mike   = new Client();    
            var thor   = new Client();    
            var eirik  = new Client();

            server.listen(function () {
                mike.connect(function () {
                    mike.send('login mike');            
                });

                thor.connect(function () {
                    thor.send('login thor');            
                });
                
                eirik.connect(function () {
                    eirik.send('help'); // Idle
                });
            });

            var connectedClients = 0;
            server.observers.onMessage.push(function () {
                if (++connectedClients === 3) {
                    assert.equal(server.clients.authorized.length, 2);
                    assert.equal(server.clients.unauthorized.length, 1);
                    mike.send('msg hello everybody, dance everybody!');
                } 
            });

            eirik.observers.onMessage.push(function (msg) {
                if (msg.response === 'message')
                    throw new Error ('Eirik got message being unauthorized.'); 
            });            
            
            var mikeMsgCount = 0;
            mike.observers.onMessage.push(function (msg) {
                if (++mikeMsgCount === 2)
                    throw new Error('Mike received his own message');
            });            
            
            var thorMsgCount = 0;
            thor.observers.onMessage.push(function (msg) {
                if (++thorMsgCount === 2) { 
                    assert.equal(msg.content, 'hello everybody, dance everybody!');
                    server.shutdown();
                    done();
                }
            });            
            
        });

        it('should disconnect from the server', function (done) {
            var server = new Server();    
            var mike   = new Client();    
            var thor   = new Client();    

            server.listen(function () {
                mike.connect(function () {
                    mike.send('login mike');            
                });

                thor.connect(function () {
                    thor.send('login thor');            
                });
            });

            var connectedClients = 0;
            server.observers.onMessage.push(function (message) {
                if (++connectedClients === 2) {
                    assert.equal(server.clients.authorized.length, 2);
                    mike.send('logout');
                } 

                if (JSON.parse(message.toString()).request === 'logout') {
                    assert.equal(server.clients.authorized.length, 1); 
                    assert.equal(server.clients.unauthorized.length, 0); 
                    server.shutdown();
                    done();
                }
            });
        });
    });

    describe('history', function () {
        it('should supply the channel history of messages when a new user logs in', function (done) {
            var server = new Server();    
            var mike   = new Client();    
            var eirik  = new Client();    
            
            var messagesByMike = 0;
            server.observers.onMessage.push(function (message) {
                if (JSON.parse(message.toString()).request === 'msg'
                &&  ++messagesByMike === 3) {
                    eirik.send('login eirik');
                }
            });
            
            var historyMessagesFromMike = [];
            var called = false;
            eirik.observers.onMessage.push(function (history) {
                if (history.response === 'history')
                    historyMessagesFromMike.push(history.content);
                
                if (called === false && historyMessagesFromMike.length === 3) {
                    called = true;

                    assert.equal(historyMessagesFromMike[0], 'heyyoo');
                    assert.equal(historyMessagesFromMike[1], 'mayooo');
                    assert.equal(historyMessagesFromMike[2], 'im a fishcake');

                    server.shutdown();
                    done();
                }
            });

            server.listen(function () {
                mike.connect(function () {
                    mike.send('login mike');            
                    mike.send('msg heyyoo');            
                    mike.send('msg mayooo');            
                    mike.send('msg im a fishcake');            
                });

                eirik.connect(function () {
                    eirik.send('help'); // idle 
                });
            });

        });
    });
    
    describe('error', function () {
        it('should be returned when invalid nickname is sent', function (done) {
            var server = new Server();    
            var mike   = new Client();    

            server.listen(function () {
                mike.connect(function () {
                    mike.send('login 3je2j#1');            
                });
            });

            mike.observers.onMessage.push(function (message) {
                assert.equal(message.response, 'error');
                assert.equal(message.content.match(/navn/i).index > 0, true);
                server.shutdown();
                done();
            });
        });

        it('should be returned when requesting "names" while not being authorized', function (done) {
            var server = new Server();    
            var mike   = new Client();    

            server.listen(function () {
                mike.connect(function () {
                    mike.send('names');            
                });
            });
            
            mike.observers.onMessage.push(function (message) {
                assert.equal(message.response, 'error');
                assert.equal(message.content.match(/not authorized/i).index > 0, true);
                server.shutdown();
                done();
            });
        });

        it('should be returned when requesting "msg" while not being authorized', function (done) {
            var server = new Server();    
            var mike   = new Client();    

            server.listen(function () {
                mike.connect(function () {
                    mike.send('msg hey everyone im not authorized');            
                });
            });

            mike.observers.onMessage.push(function (message) {
                assert.equal(message.response, 'error');
                assert.equal(message.content.match(/not authorized/i).index > 0, true);
                server.shutdown();
                done();
            });
        });

        it('should be returned when payload is single-quoted JSON', function (done) {
            var server = new Server();    

            server.listen(function () {
                var raw = new net.Socket();
                raw.connect(1337, '127.0.0.1', function () {
                    raw.write('{\n' + 
                    '    \'request\': \'help\'\n' +
                    '    \'content\': null\n' +
                    '}');
                });
                raw.on('data', function (chunk) {
                    assert.equal(JSON.parse(chunk.toString()).response, 'error');
                    assert.equal(JSON.parse(chunk.toString()).content.match(/JSON/i).index > 0, true);
                    done();
                });
            });

        });
    });
});
