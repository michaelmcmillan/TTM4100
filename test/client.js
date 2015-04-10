var assert = require('assert');
var Client = require('../client.js');

describe('Client', function () {
    describe('commands', function () {
        it('should allow the five basic commands: login, logout, msg, names and help.', function () {
            var client = new Client();
            assert.doesNotThrow(function () {
                client.parse('login nick');
                client.parse('logout');
                client.parse('msg message');
                client.parse('names');
                client.parse('help');
            });
        }, /ugydlig kommando/i);

        it('should throw an exception on illegal commands', function () {
            var client = new Client();
            assert.throws(function () {
                client.parse('signin');
            });
        });

        it('should be rejected when missing required parameters', function () {
            var client = new Client();
            assert.throws(function () {
                client.parse('login');
            }, /mangler argument/i);
        });

        it('should return the entire message (with whitespace)', function () {
            var client = new Client();
            assert.equal(client.parse('msg hello world'), JSON.stringify({
                request: 'msg',
                content: 'hello world'
            }));
        });

        it('should not break when msg content contains the string "msg"', function () {
            var client = new Client();
            assert.equal(client.parse('msg msg'), JSON.stringify({
                request: "msg",
                content: "msg"
            }));

            assert.equal(client.parse('msg hello msg'), JSON.stringify({
                request: "msg",
                content: "hello msg"
            }));
        });
    });

    describe('outgoing payload', function () {
        it('should be valid JSON with request and content field', function () {
            var client = new Client();
            assert.equal(client.parse('login mike'), JSON.stringify({
                request: "login",
                content: "mike"
            }));
        });

        it('should return null as content when the command does require args', function () {
            var client = new Client();
            assert.equal(client.parse('logout'), JSON.stringify({
                request: "logout",
                content: null 
            }));
        });
    });

    describe('incoming payload', function () {
        it('should deconstruct stringified JSON payload from server', function () {
            var client = new Client();
            var serverPayload = JSON.stringify({
                timestamp: new Date(),
                sender: "mike",
                response: "hello world",
                content: "ye"
            });
            assert.equal(client.deconstructPayload(serverPayload).sender, 'mike');
            assert.equal(client.deconstructPayload(serverPayload).content, 'ye');
            assert.equal(client.deconstructPayload(serverPayload).response, 'hello world');
        });
    }); 
});
