(function() {
    'use strict';
    
    var path            = require('path'),
        EventEmitter    = require('events').EventEmitter,
        child_process   = require('child_process'),
        
        exec            = child_process.exec,
        
        WIN             = process.platform === 'win32',
        spawn           = child_process.spawn,
        
        Util            = require('util-io'),
        find            = require('glob'),
        win             = require('win32');
        
    win.prepareCodePage();
    
    module.exports = function(command, options) {
        var emitter = new EventEmitter();
        
        Util.check(arguments, ['command']);
        
        if (!options)
            options     = {
                cwd: process.cwd()
            };
        
        process.nextTick(function() {
            onMessage(command, options, emitter);
        });
        
        return emitter;
    };
    
    function onMessage(command, options, emitter) {
        var firstChar,
            dir         = options.cwd,
            isVolume    = win.isChangeVolume(command),
            isCD        = /^cd ?/.test(command),
            isCDWin     = /^cd ?/i.test(command),
            
            symbolsExec = ['~', '#', '*', '&', '{', '}', '|', '\'', '"', ';'],
            
            isSymbol    = isContain(command, symbolsExec);
            
        Util.check(arguments, ['command', 'options', 'callback']);
        
        if (isCD || isCDWin && WIN || isVolume) {
            onCD(command, dir, emitter);
        } else {
            if (WIN)
                command    = 'cmd /C ' + command;
            
            firstChar       = command[0];
            
            if (firstChar === ' ' || isSymbol)
                set('exec', command, options, emitter);
            else
                set('spawn', command, options, emitter);
        }
    }
    
    function set(type, command, options, emitter) {
        var error, child;
        
        Util.check(arguments, ['type', 'command', 'options', 'emitter']);
        
        var args;
        
        switch(type) {
        default:
            throw(Error('type could be exec or spawn only!'));
        
        case 'exec':
            error   = Util.exec.try(function() {
                child = exec(command, options);
            });
            break;
        
        case 'spawn':
            args    = command.split(' ');
            command = args.shift();
            
            error   = Util.exec.try(function() {
                child = spawn(command, args, options);
            });
            break;
        }
        
        if (error)
            emitter.emit('error', error);
        else
            setListeners(child, emitter);
    }
    
    function setListeners(child, emitter) {
        Util.check(arguments, ['child', 'emitter']);
        
        child.stderr.setEncoding('utf8');
        child.stdout.setEncoding('utf8');
        
        child.stdout.on('data', function(data) {
            emitter.emit('data', data);
        });
        
        child.stderr.on('data', function(error) {
            emitter.emit('error', Error(error));
        });
        
        child.on('error', function(error) {
            emitter.emit('error', error);
        });
        
        child.on('close', function() {
            child = null;
            emitter.emit('close');
        });
    }
    
    function onCD(command, currDir, emitter) {
        var wasError,
            CD              = 'cd ',
            HOME            = process.env.HOME,
            
            isChangeVolume  = win.isChangeVolume(command),
            isVolume        = win.isVolume(command),
            paramDir        = Util.rmStrOnce(command, [CD, 'cd']),
            
            regExpHome      = RegExp('^~'),
            regExpRoot      = RegExp('^[/\\\\]'),
             
            isWildCard      = isContain(paramDir, ['*', '?']),
            isHome          = regExpHome.test(paramDir) && !WIN,
            isRoot;
        
        emitter.on('error', function() {
            wasError = true;
        });
        
        emitter.on('close', function() {
           if (!wasError)
                emitter.emit('path', paramDir);
        });
        
        if (isHome) {
            command     = command.replace('~', HOME);
            paramDir    = paramDir.replace('~', HOME);
        }
        
        if (!paramDir && !WIN)
            paramDir = '.';
        
        if (!isChangeVolume || isVolume) {
            paramDir    = getFirstWord(paramDir);
            paramDir    = path.normalize(paramDir);
            
            isRoot      = regExpRoot.test(paramDir);
            
            command     = Util.rmStrOnce(command, [
                CD,
                paramDir,
                '\'' + paramDir + '\'',
                '"'  + paramDir + '"',
            ]);
            
            if (!isHome && !isRoot)
                paramDir    = path.join(currDir, paramDir);
            
            if (isWildCard)
                command = CD + paramDir + ' ' + command;
            else
                command = CD + '"' + paramDir + '" ' + command;
        }
        
        if (!isWildCard) {
            set('exec', command, {cwd: paramDir}, emitter);
        } else {
            find(paramDir, function(error, dirs) {
                var dir;
                
                if (!error)
                    dir = dirs[0];
                    
                paramDir    = dir;
                set('exec', command, {cwd: dir}, emitter);
            });
        }
    }
    
    function getFirstWord(str) {
        var word, result,
            regStrEnd       = getRegStrEnd(),
            regStr          = '^(.*?)',
            regStrQuotes    = '^"(.*)"',
            regExp          = RegExp(regStr + regStrEnd),
            regExpQuotes    = RegExp(regStrQuotes + regStrEnd + '?'),
            is              = Util.type.string(str);
        
        if (is) {
            result  = str.match(regExpQuotes);
            
            if (result) {
                word    = result[1];
            } else {
                result  = str.match(regExp);
                word    = result && result[1];
            }
            
            if (!word)
                word    = str;
        }
        
        return word;
    }
    
    function getRegStrEnd() {
        var regStrEnd = '(\\s|\\;|&&|\\|\\|)';
        
        return regStrEnd;
    }
    
    function isContain(str, symbols) {
        Util.check(arguments, ['str', 'symbols'])
            .type('str', str, 'string')
            .type('symbols', symbols, 'array');
        
        return symbols.some(function(symbol) {
            return ~str.indexOf(symbol);
        });
    }
    
})();
