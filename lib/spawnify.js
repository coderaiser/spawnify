(function() {
    'use strict';
    
    var path            = require('path'),
        EventEmitter    = require('events').EventEmitter,
        util            = require('util'),
        assert          = require('assert'),
        child_process   = require('child_process'),
        
        exec            = child_process.exec,
        tryCatch        = require('try-catch'),
        
        WIN             = process.platform === 'win32',
        spawn           = child_process.spawn,
        
        find            = require('glob'),
        win             = require('win32'),
        
        newLine         = function (error) {
            error.message += '\n';
            return error;
        };
    
    util.inherits(Spawnify, EventEmitter);
    win.prepareCodePage();
    
    module.exports = function(command, options) {
        var spawnify;
        
        assert(command, 'command could not be empty!');
        
        if (options && options.cwd)
            options.cwd = parseDir(options.cwd);
        else
            options     = {
                cwd: process.cwd()
            };
        
        spawnify    = new Spawnify(command, options);
        
        return spawnify;
    };
    
    function getHome() {
        var HOME_WIN    = process.env.HOMEPATH,
            HOME_UNIX   = process.env.HOME,
            HOME        = HOME_WIN || HOME_UNIX;
        
        return HOME;
    }
    
    function parseDir(dir) {
        var home    = getHome(),
            cwd     = process.cwd();
        
        assert(dir, 'dir should be string!');
        
        dir = dir.replace(/^~/, home)
                 .replace(/^\./, cwd);
        
        return dir;
    }
    
    function Spawnify(command, options) {
        var self = this;
        
        EventEmitter.call(this);
        
        process.nextTick(function() {
            self._onMessage(command, options);
        });
    }
    
    Spawnify.prototype._onMessage = function onMessage(command, options) {
        var firstChar,
            dir         = options.cwd,
            isVolume    = win.isChangeVolume(command),
            
            regExpCD    = /^cd ?/,
            regExpCDWin = /^cd ?/i,
            
            isCD        = regExpCD.test(command),
            isCDWin     = regExpCDWin.test(command),
            
            symbolsExec = [
                '~', '>', '<', '#',
                '*', '&', '{', '}',
                '|', '\'','"', ';',
                '`'
            ],
            
            isSymbol    = isContain(command, symbolsExec);
            
        assert(command, 'command could not be empty!');
        assert(command, 'options could not be empty!');
        
        if (isCD || isCDWin && WIN || isVolume) {
            command = command
                .replace(WIN ? regExpCDWin : regExpCD, '');
            
            this._onCD(command, dir);
        } else {
            if (WIN)
                command    = 'cmd /C ' + command;
            
            firstChar       = command[0];
            
            if (firstChar === ' ' || isSymbol)
                this._set('exec', command, options);
            else
                this._set('spawn', command, options);
        }
    };
    
    Spawnify.prototype._emit = function emit(event, data) {
        var self    = this,
            count   = function(event) {
                var listeners = self.listeners(event);
                
                return listeners.length;
            };
        
        assert(event, 'event could not be empty!');
        
        if (count(event) || event === 'error') {
            this.emit(event, data);
            
            /* 
             * when code is EACESS
             * close and exit events
             * whould not be emitted
             */
            if (event === 'error' && data.code === 'EACCES') {
                if (count('close'))
                    this.emit('close');
                
                if (count('exit'))
                    this.emit('exit');
            }
        }
    };
    
    Spawnify.prototype._set = function set(type, command, options) {
        var args, error, child;
        
        assert(type, 'event could not be empty!');
        assert(command, 'command could not be empty!');
        assert(options, 'options could not be empty!');
        
        switch(type) {
        default:
            throw(Error('type could be exec or spawn only!'));
        
        case 'exec':
            error   = tryCatch(function() {
                child = exec(command, options);
            });
            break;
        
        case 'spawn':
            args    = command.split(' ');
            command = args.shift();
            
            error   = tryCatch(function() {
                child = spawn(command, args, options);
            });
            break;
        }
        
        if (error) {
            if (error.code === 'ENOTDIR')
                error.message = error.code + ': ' + options.cwd;
            
            this._emit('error', newLine(error));
            this._emit('close');
            this._emit('exit');
        } else {
            child.stderr.setEncoding('utf-8');
            child.stdout.setEncoding('utf-8');
            child.stdin.setEncoding('utf-8');
            
            this._setListeners(child);
            
            this.on('kill', function(code) {
                child.kill(code);
            });
            
            this.on('write', function(data) {
                child.stdin.write(data);
            });
            
            this._emit('start');
        }
    };
    
    Spawnify.prototype.kill = function(code) {
        this._emit('kill', code);
    };
    
    Spawnify.prototype.write = function(data) {
        this._emit('write', data);
    };
    
    Spawnify.prototype._setListeners = function setListeners(child) {
        var self = this;
        
        assert(child, 'child could not be empty!');
        
        child.stdin.on('error', function(error) {
            self._emit('error', newLine(error));
        });
        
        child.stdout.on('data', function(data) {
            self._emit('data', data);
        });
        
        child.stdout.on('error', function(error) {
            self._emit('error', newLine(error));
        });
        
        child.stderr.on('data', function(error) {
            self._emit('error', Error(error));
        });
        
        child.stderr.on('error', function(error) {
            self._emit('error', newLine(error));
        });
        
        child.on('error', function(error) {
            self._emit('error', newLine(error));
        });
        
        child.on('exit', function() {
            child = null;
            self._emit('exit');
        });
        
        child.on('close', function() {
            child = null;
            self._emit('close');
        });
    };
    
    Spawnify.prototype._onCD = function onCD(command, currDir) {
        var wasError, strs,
            self            = this,
            CD              = 'cd ',
            HOME            = getHome(),
            
            isChangeVolume  = win.isChangeVolume(command),
            isVolume        = win.isVolume(command),
            paramDir,
            
            regExpHome      = RegExp('^~'),
            regExpRoot      = RegExp('^[/\\\\]'),
             
            isWildCard,
            isHome          = regExpHome.test(command) && !WIN,
            isRoot;
        
        this.on('error', function() {
            wasError = true;
        });
        
        this.on('close', function() {
           if (!wasError)
                this._emit('path', paramDir);
        });
        
        if (isHome)
            command     = command.replace('~', HOME);
            
        paramDir        = command;
        isWildCard      = isContain(paramDir, ['*', '?']);
        
        if (!paramDir && !WIN)
            paramDir = '.';
        
        if (!isChangeVolume || isVolume) {
            paramDir    = this._getFirstWord(paramDir);
            paramDir    = path.normalize(paramDir);
            
            isRoot      = regExpRoot.test(paramDir);
            
            strs        = [
                CD,
                paramDir,
                '\'' + paramDir + '\'',
                '"'  + paramDir + '"',
            ];
            
            strs.forEach(function(str) {
                command = command.replace(str, '');
            });
            
            if (!isHome && !isRoot)
                paramDir    = path.join(currDir, paramDir);
            
            if (isWildCard)
                command = CD + paramDir + ' ' + command;
            else
                command = CD + '"' + paramDir + '" ' + command;
        }
        
        if (!isWildCard)
            self._set('exec', command, {cwd: paramDir});
        else
            find(paramDir, function(error, dirs) {
                var dir;
                
                if (!error)
                    dir = dirs[0];
                    
                paramDir    = dir;
                self._set('exec', command, {cwd: dir});
            });
    };
    
    Spawnify.prototype._getFirstWord = function getFirstWord(str) {
        var word, result,
            regStrEnd       = getRegStrEnd(),
            regStr          = '^(.*?)',
            regStrQuotes    = '^"(.*)"',
            regExp          = RegExp(regStr + regStrEnd),
            regExpQuotes    = RegExp(regStrQuotes + regStrEnd + '?'),
            is              = typeof str === 'string';
        
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
    };
    
    function getRegStrEnd() {
        var chars       = ['s', ';', '&&', '\\', '|'],
            
            escaped     = chars
                .map(function(char) {
                    return '\\' + char;
                }).join('|'),
            
            regStr      = '(' + escaped + ')';
        
        return regStr;
    }
    
    function isContain(str, symbols) {
        assert(str, 'str could not be empty!');
        assert(symbols, 'symbols could not be empty!');
        
        return symbols.some(function(symbol) {
            return ~str.indexOf(symbol);
        });
    }
    
})();
