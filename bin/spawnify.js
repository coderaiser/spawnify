#!/usr/bin/env node

(function() {
    'use strict';
    
    var spawnify    = require('../'),
        slice       = [].slice.bind(process.argv),
        argv        = slice(),
        command     = '';
        
        argv.shift();
        argv.shift();
        
        command     = argv.join(' ');
    
    if (command)
        spawnify(command, function(error, json) {
            var str = JSON.stringify(json);
            console.log(str);
        });
})();
