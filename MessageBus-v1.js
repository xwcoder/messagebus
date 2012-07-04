(function(window, undefined){
    var id = 1;
    var toString = Object.prototype.toString;
    
    var applyIf = function(o, c) {
        if (o) {
            for (var p in c) {
                typeof o[p] === 'undefined' && (o[p] = c[p]);
            }
        }
        return o;
    };

    var generateId = function(prefix){
        return (prefix || '') + id++;
    };

    var throwException = function(msg){
        throw new Error(msg);
    };

    var illegalTopic = function(topic){
        throwException('illegalTopic:' + topic);
    };

    var checkSubTopic = function(topic){
        (!topic || !topic.length || toString.call(topic) != '[object String]' 
            || /\*{2}\.\*{2}/.test(topic)
            || /([^\.\*]\*)|(\*[^\.\*])/.test(topic)
            || /(\*\*\.\*)|(\*\.\*\*)/.test(topic)
            || /\*{3}/.test(topic) || /\.{2}/.test(topic)
            || topic[0] == '.' || topic[topic.length-1] == '.') && illegalTopic(topic);
    };

    var checkIllegalCharactor = function(topic){
        var m = /[^a-zA-Z0-9-_\.\*]/.exec(topic);
        if(m){
            throwException('illegalCharactor:' + m[1]);
        }
    };

    var checkPubTopic = function(topic){
        (!topic || !topic.length || toString.call(topic) != '[object String]' 
            || topic.indexOf('*') != -1 || topic[0] == '.' 
            || /\.{2}/.test(topic)
            || topic[topic.length] == '.') && illegalTopic(topic);
    };

    var doCall = function(topic, msg, handlers, pubId) {
        msg = msg || null;
        var wrapFn, config;
        var checkWait = function(_topics, topics, topic, msg) {
            var r = true;
            topics[topic] = msg;
            _topics[topic] = true;
            for (var t in _topics) {
                if (!_topics[t]) {
                    r = false;
                    break;
                }
            }
            return r;
        };

        var clearWait = function(_topics, topics) {
            for (var t in _topics) {
                _topics[t] = false;
            }
        };

        for (var i = 0, len = handlers.length; i < len; i++) {
            wrapFn = handlers[i];
            if (typeof pubId === 'undefined' || wrapFn.pubId !== pubId) {
                wrapFn.pubId = pubId;
                config = wrapFn.config;
                       
                if (config && config._topics) {
                    if (checkWait(config._topics, config.topics, topic, msg)) {
                        clearWait(config._topics, config.topics);
                        wrapFn.h.call(wrapFn.scope, topic, config.topics , wrapFn.data);
                    }
                } else {
                    wrapFn.execedTime++;
                    if (toString.call(wrapFn.config.execTime) == '[object Number]'
                            && wrapFn.execedTime >= wrapFn.config.execTime) {
                        handlers.splice(i--,1);
                        len = handlers.length;
                    }
                    wrapFn.h.call(wrapFn.scope, topic, msg, wrapFn.data);
                }
            }
        }
    };

    var deleteWrapFn = function(h, id){
        for(var i = 0, len = h.length; i < len; i++){
            if(h[i].sid == id){
                h.splice(i,1);
                break;
            }
        }
    };

    var match = function(p, t){
        if(p == t || t == '**'){
            return true;
        }
        t = t.replace(/\.\*\*\./g,'(((\\..+?\\.)*)|\\.)');
        t = t.replace(/^\*\*\./,'(.+?\\.)*');
        t = t.replace(/\.\*\*$/,'(\\..+?)*');

        t = t.replace(/\.\*\./g,'(\\..+?\\.)');
        t = t.replace(/^\*\./g,'(.+?\\.)');
        t = t.replace(/\.\*$/g,'(\\..+?)');

        return new RegExp(t).test(p);
    };

    var query = function(topic, pubItems) {
        var msgs = [];
        for(var p in pubItems){
            if(match(p, topic)){
                msgs.push({topic : p, value : pubItems[p]});
            }
        }
        return msgs;
    };

    var defaults = {
        cache : true
    };

    function MessageBus(c) {
        c = c || {};
        this.config = applyIf(c, defaults);
        this.subTree = {t:{},h:[]};
        this.pubItems = {};
    }

    applyIf(MessageBus.prototype, {
        version : '1.0',

        subscribe : function(topic, handler, scope, data, config) {
            checkSubTopic(topic); 
            checkIllegalCharactor(topic);
            scope = scope || window;
            config = config || {};

            var sid = generateId();
            var wrapFn = {h : handler, scope : scope, data : data, sid : sid, execedTime : 0, config : config};
            var path = topic.split('.'), i = 0, len = path.length;
            
            (function(path, index, handler, tree){
                var token = path[index];
                if(index == path.length){
                    tree.h.push(handler); 
                }else{
                    if(!tree.t[token]){
                        tree.t[token] = {t:{}, h:[]};
                    }
                    arguments.callee.call(this, path, ++index, handler, tree.t[token]);
                }
            })(path, 0, wrapFn, this.subTree);

            if(this.config.cache && !!config.cache){
                var msgs = query(topic, this.pubItems);
                for(i = 0, len = msgs.length; i < len; i++){
                    doCall(msgs[i].topic, msgs[i].value, [wrapFn]);
                }
            }
            return topic + '^' + sid;
        },

        publish : function(topic, msg) {
            checkPubTopic(topic);
            checkIllegalCharactor(topic);

            this.pubItems[topic] = msg;

            var path = topic.split('.');
            var token;

            (function(path, index, tree, msg, topic, pubId, seed){
                var token = path[index];
                if(index == path.length){
                    doCall(topic, msg, (seed && seed.isWildcard) ? tree.t['**'].h : tree.h, pubId);
                }else{
                    if(tree.t['**']){
                        if(tree.t['**'].t[token]){
                            arguments.callee.call(this, path, index + 1, tree.t['**'].t[token], msg, topic, pubId, {index : index, tree:tree});
                        }else{
                            arguments.callee.call(this, path, index + 1, tree, msg, topic, pubId, {isWildcard : true});
                        }
                    }
                    if(tree.t[token]){
                        arguments.callee.call(this, path, index + 1, tree.t[token], msg, topic, pubId);
                    }else if(seed && !seed.isWildcard){
                        arguments.callee.call(this, path, ++seed.index, seed.tree, msg, topic, pubId, seed);
                    }
                    if(tree.t['*']){
                        arguments.callee.call(this, path, index + 1, tree.t['*'], msg, topic, pubId);
                    }
                }
            })(path, 0, this.subTree, msg, topic, generateId());
        },

        unsubscribe : function(sids) {
            var me = this;

            var unsubscribe = function(sid) {
                var sid = sid.split('^');
                if(sid.length != 2){
                    throwException('illegal sid:' + sid);
                }
                var path = sid[0].split('.');
                var id = sid[1];
                (function(path, index, tree, id){
                    var token = path[index];
                    if(index == path.length){
                        deleteWrapFn(tree.h, id);
                    }else{
                        if(tree.t[token]){
                            arguments.callee.call(this, path, ++index, tree.t[token], id);
                        }            
                    }
                })(path, 0, me.subTree, id);
            };

            var sids = sids.split(';');
            var i = 0, len = sids.length;
            for (; i < len; i++) {
                unsubscribe(sids[i]);
            }
        },

        wait : function(topics, handler, scope, data, config) {
            if (toString.call(topics) !== '[object Array]' || !topics.length) {
                return;
            } 
            
            config = config || {};
            config.topics = {};
            config._topics = {};
            var sids = [];

            var i = 0, len = topics.length, topic;
            for (; i < len; i++) {
                topic = topics[i];
                checkPubTopic(topics[i]);
                config.topics[topic] = null;
                config._topics[topic] = false;
            }

            for (i = 0; i < len; i++) {
                sids.push(this.subscribe(topics[i], handler, scope, data, config)); 
            }
            return sids.join(';');
        }
    });
    
    window.messagebus = new MessageBus();
    window.MessageBus = MessageBus;
})(window, undefined);
