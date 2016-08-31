/*
    Runs the qunit runner from the command line on various test pages.
    Monitors the output and tests for consistency.
*/

var child_process = require("child_process"),
    phantomjs = require('phantomjs-prebuilt'),
    assert = require('assert'),
    expect = require('chai').expect;
var pjsPath = phantomjs.path;

it('Can handle tests with no module',
    function ( done ) {
        _runChild(
            't/no-module.html', [],
            function ( data ) {
                assert.ok(/ - No module/.test(data), "Tests without modules are shown");
                assert.ok(/ - No module second test - got: 5, expected: 6/.test(data), "One failed test");
                assert.equal( data.split("\n").length, 2, "Should only be two lines of output");
                done();
            }
        );
    }
);

it('Outputs nice JSON',
    function ( done ) {
        _runChild(
            't/nice-json.html', [ '--json' ],
            function ( data ){
                var dataObj = JSON.parse( data );
                assert.equal( dataObj.modules[0].name, "My Module" );
                assert.equal( dataObj.modules[0].tests.length, 1 );
                assert.equal( dataObj.modules[0].tests[0].assertions.length, 2 );
                assert.equal( dataObj.modules[0].tests[0].name, "first test" );
                assert.equal( dataObj.modules[1].tests.length, 2 );
                done();
            }
        );
    }
);

it('Shows help if input file not found',
    function ( done ) {
        _runChild(
            't/doesnt-exist.html', [],
            function ( data ){
                expect(data).to.have.string("HELP\n\nFile t/doesnt-exist.html doesn't exist");
                done();
            }
        );
    }
);

function _runChild ( testName, args, closeCB ){
    var _output = "";
    var childProcess = child_process.spawn(
        pjsPath, ['runner.js', testName].concat(args)
    );
    childProcess.stdout.on('data', (data) => {
        _output += data.toString('ascii');
    });
    childProcess.on('close', function ( exitCode ) { closeCB( _output.trim(), exitCode ); });
}
