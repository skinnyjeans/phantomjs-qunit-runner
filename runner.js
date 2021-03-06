/*
    Yet another qunit-runner!

    parts inspired by https://github.com/jonkemp/qunit-phantomjs-runner

    needs:
        PhantomJS > 1.6
        Node > 6.0
        QUnit > 1.20
        
*/

(function () {

    var page = require('webpage').create(),
        opts = _parseOpts( require('system').args ),
        testTimeout = null;

    /*
        The page setup,

        onCallback: PhantomJS injects a means to communicate with this node module from within page,
            this was introduced into PhantomJS after v1.6. We also maintain a running timeout so if
            the child page doesn't "talk" to phantomjs in 10 seconds ( default ) it will end the tests
            early so it won't block forever

        onInitialized: Is called when the page is loaded ( but not necessarily rendered ) by PhantomJS,
            it is at this point that we inject our QUnit reporting methods into the page

        onConsoleMessage: allows the output of console.log from the child page, nullop for now... uncomment
            for debug

    */

    page.onCallback = function ( data ) {
        clearTimeout( testTimeout );

        if ( data.message ) {
            console.log( data.message );
        }
        if ( typeof(data.finish) !== "undefined" ) {

            if ( typeof( data.finish ) == "object" ){
                _writeOutput( JSON.stringify( data.finish ), opts.output );
            }
            else {
                _writeOutput( data.finish, opts.output );
            }

            return exit( data.hasFailures ? 1 : 0 );
        }

        testTimeout = setTimeout( function () { exit( 0 ); }, opts.timeout );
    };

    // add QUnit hooks
    page.onInitialized = function () {

        if ( opts.junit ){
            page.evaluate(addJUnit);
        }
        else if ( opts.json ){
            page.evaluate(addJSON);
        }
        else {
            page.evaluate(addDefault);
        }

    };

    if ( opts.verbose ){
        page.onConsoleMessage = function (msg) {
            console.log(msg);
        };
    }

    page.open(opts.page, function(stat) {
        if ( stat === "fail" ){
            console.log( "webpage wouldn't open" );
            phantom.exit(1);
        }
        testTimeout = setTimeout( function () { exit( 0 ); }, opts.timeout );
    });

    var exit = function ( code ) {
        page.close();
        setTimeout( function () { phantom.exit( code ); }, 100 );
    };

    /* addDefault

        For outputting to the terminal, has nice colours, looks like:

        Module name 1
         - Test 1: 1/3
            failure 1 for test 1
            failure 2 for test 1
         - Test 2: 4/4
         - Test 3: 1/1

        Module name 2
         ...

    */

    var addDefault = function () {
        window.document.addEventListener('DOMContentLoaded', function () {

            var _currentModule = "",
                _testFailures = {};

            /* QUnit.testDone
                gets called every time a QUnit.test(...) block finishes, result is an object which looks like...
                https://api.qunitjs.com/QUnit.testDone/

                Here we print out some nice text to show which errors fails etc...
            */
            QUnit.testDone(function (result) {

                if ( result.module !== _currentModule ){
                    window.callPhantom({ message: "\nModule - " + result.module });
                    _currentModule = result.module;
                }

                if ( result.failed == 0 ){
                    window.callPhantom({
                        message: " - \033[32m" + result.name + ":\033[39m " + result.passed + "/" + result.total
                    });
                }
                else {
                    window.callPhantom({ 
                        message: " - \033[31m" + result.name + ":\033[39m " + result.passed + "/" + result.total
                    });

                    _testFailures[result.module+":"+result.name].forEach( function ( result ) {
                        var message = ( result.message || "Unnamed" );
                        if ( typeof(result.expected) !== "undefined" ){
                            if ( typeof(result.actual) !== "undefined" ){
                                message = message + " - got: " + result.actual;
                            }
                            message = message + ", expected: " + result.expected;
                        }
                        window.callPhantom({ message: "   - " + message });
                    });
                }
            });

            /* QUnit.log
                gets called after each assertion, result is an object which looks like...
                https://api.qunitjs.com/QUnit.log/

                We use it to maintain a list of assertions which have failed, they get printed out
                after the test block has finished ( see QUnit.testDone )
            */
            QUnit.log(function (result) {
                if ( ! result.result ) {
                    var _name = result.module+":"+result.name;
                    if ( typeof ( _testFailures[_name] ) === "undefined" ){
                        _testFailures[_name] = [];
                    }
                    _testFailures[_name].push(result);
                }
                window.callPhantom({});
            });

            QUnit.done(function (result) {
                window.callPhantom({ finish: "", hasFailures: (result.failed > 0 ? true : false) });
            });
        });
    };

    /* addJUnit

        The only output from this should be JUnit XML... see
        https://github.com/JamesMGreene/qunit-reporter-junit

    */

    var addJUnit = function () {
        window.document.addEventListener('DOMContentLoaded', function () {
            QUnit.jUnitReport = function(result) {
                window.callPhantom({
                    finish: result.xml,
                    hasFailures: (result.failed > 0 ? true : false)
                });
            };
            QUnit.log(function (result) { window.callPhantom({}); });
        });
    };

    /* addJSON

        Outputs in a JSON format using the outputs from QUnit as the basis

        {
            "My Module": [
                {
                    "name": "My first test",
                    "assertions": [
                        { "message": "button was found OK", result: true },
                        ...
                    ],
                    "failed": 0,
                    "duration": 1200,
                    "passed": 2,
                    "runtime": 1200,
                    "skipped": false,
                    "total": 2
                },
                ...
            ],
            ...
        }

    */

    var addJSON = function () {
        window.document.addEventListener('DOMContentLoaded', function () {
            var _testReport = {};
            QUnit.moduleDone(function (result) {
                var moduleName = result.name || 'unnamed';
                result.tests = _testReport[moduleName].tests;
                _testReport[moduleName] = result;
            });
            QUnit.testDone(function (result) {
                var moduleName = result.module || 'unnamed';
                _testReport[moduleName] = _testReport[moduleName] || { tests : [] };
                _testReport[moduleName].tests.push(result);
            });
            QUnit.done(function (result) {
                window.callPhantom({
                    finish: { modules: Object.keys(_testReport).map( function (key) { return _testReport[key] } ) },
                    hasFailures: (result.failed > 0 ? true : false)
                });
            });
            QUnit.log(function (result) { window.callPhantom({}); });
        });
    };

    function _parseOpts ( args ) {
        args.shift(); // the first arg is this file

        if ( args.length === 0 ){
            _help();
        }

        var optRe = /^--/;
        var options = {
            timeout: 10000
        };
        args.forEach( function ( arg, index ) {
            if ( arg == "--help" ){
                _help();
            }
            if ( optRe.test( arg ) ){
                options[arg.substring(2)] =
                    ( args.length == index+1 || optRe.test( args[index+1] ) ) ? true : args[index+1];
            }
        });

        options.page = args.shift();
        if ( ! require('fs').exists( options.page ) ){
            _help("File " + options.page + " doesn't exist");
        }

        return options;
    }

    function _help (msg) {
        msg = typeof(msg)=="undefined"?"" : "\n" + msg + "\n";
        console.log( "\nHELP\n" + msg + "\n"
            + "USAGE: phantomjs <this_file>.js <qunit_test_page>.html\n\n"
            + "--junit - optional, output is junit.xml ( requires qunit-reporter-junit )\n"
            + "--json - optional, output is qunit json\n"
            + "--timeout - optional, time to wait between tests running, protects against hanging tests\n"
            + "--verbose - enables console.log from source page\n"
            + "--output - file to write output to\n"
        );
        phantom.exit( 1 );
    }

    function _writeOutput ( output, file ){
        if ( file ) {
            require('fs').write( file, output, 'w' );
        }
        else {
            console.log( output );
        }
    }

})();
