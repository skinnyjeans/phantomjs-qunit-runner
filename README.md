## Yet another qunit-runner!

parts inspired by https://github.com/jonkemp/qunit-phantomjs-runner

#### needs
    PhantomJS > 1.6
    Node > 6.0
    QUnit > 1.20

### Usage

    ./local-node/bin/node ./node_modules/.bin/phantomjs ./vendor/phantomjs-qunit-runner/runner.js mytest.html

#### Options

    --junit - optional, output is junit.xml ( requires qunit-reporter-junit )
    --json - optional, output is qunit json
    --timeout - optional, time to wait between tests running, protects against hanging tests
    --verbose - enables console.log from source page
    --output - specify a filename to output final report to

### Output

#### Default

For outputting to the terminal, has nice colours, looks like:

    Module name 1
     - Test 1: 1/3
        failure 1 for test 1
        failure 2 for test 1
     - Test 2: 4/4
     - Test 3: 1/1

    Module name 2
     ...

#### jUnit

The only output from this should be JUnit XML... see
https://github.com/JamesMGreene/qunit-reporter-junit

#### JSON

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

#### Developing

Run tests using mocha
