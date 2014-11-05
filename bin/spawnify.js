#!/usr/bin/env node

(function() {
    'use strict';
    
    var spawn,
        spawnify    = require('../'),
        slice       = [].slice.bind(process.argv),
        argv        = slice(2),
        command     = argv.join(' ');
    
    if (!command) {
        console.log('spawnify <command>');
    } else {
        spawn = spawnify(command);
        spawn.on('data', function(data) {
            console.log(data);
        });
        
        spawn.on('error', function(error) {
            console.error(error.message);
        });
        
        spawn.on('path', function() {
            
        });
        
        spawn.on('end', function() {
            
        });
    }
})();
