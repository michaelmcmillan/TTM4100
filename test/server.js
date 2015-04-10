var assert = require('assert');
var Server = require('../server.js');

describe('Server', function () {
    describe('commands', function () {
        it('should allow the five basic commands: login, logout, msg, names and help.', function () {
            var server = new Server();
            assert.doesNotThrow(function () {
                server.parse(JSON.stringify({request: 'login',  content: 'mike'}));
                server.parse(JSON.stringify({request: 'msg',    content: 'hello world'}));
                server.parse(JSON.stringify({request: 'help',   content: null}));
                server.parse(JSON.stringify({request: 'names',  content: null}));
                server.parse(JSON.stringify({request: 'logout', content: null}));
            });
        });

        it('should reject commands with content when the command does not require it', function () {
           var server = new Server();
           assert.throws(function () {
               server.parse(JSON.stringify({request: 'help', content: 'please'}));
           });
        });

        it('should treat empty string as null in content-field', function () {
           var server = new Server();
           assert.doesNotThrow(function () {
               server.parse(JSON.stringify({request: 'help', content: ''}));
           });
        });
    });

    describe('nickname', function () {
        it('should reject non-alphanumeric nicknames', function () {
            var server = new Server();
            assert.throws(function () {
                server.parse(JSON.stringify({request: 'login', content: 'mik#1337eh!'}));
            }, /ulovlig navn/i);
        });

        it('should allow alphanumeric nicknames', function () {
            var server = new Server();
            assert.doesNotThrow(function () {
                server.parse(JSON.stringify({request: 'login', content: 'mike'}));
            });
        });
    });

    describe('msg', function () {
        it('should return the entire message (with whitespace)', function () {
            var server = new Server();
            var msg = JSON.stringify({request: 'msg', content: 'hello world'});
            assert.equal(server.parse(msg).content, 'hello world');
        });
    });
});
