(function (window, undefined) {

  var id = 1,
    toString = Object.prototype.toString,
    defaults = {
      cache: true
    }

  function applyIf (o, c) {
    if (o) {
      for (var p in c) {
        if (typeof o[p] === 'undefined') {
          o[p] = c[p]
        }
      }
    }
    return o
  }

  function generateId (prefix) {
    return (prefix || '') + id++
  }

  function throwException (msg) {
    throw new Error(msg)
  }

  function illegalTopic (topic) {
    throwException('illegalTopic:' + topic)
  }

  function checkSubTopic (topic) {
    if (!topic || !topic.length || toString.call(topic) != '[object String]' ||
        /\*{2}\.\*{2}/.test(topic) ||
        /([^\.\*]\*)|(\*[^\.\*])/.test(topic) ||
        /(\*\*\.\*)|(\*\.\*\*)/.test(topic) ||
        /\*{3}/.test(topic) ||
        /\.{2}/.test(topic) ||
        topic[0] == '.' ||
        topic[topic.length-1] == '.') {

      illegalTopic(topic)
    }
  }

  function checkIllegalCharactor (topic) {
    var m = /[^a-zA-Z0-9-_\.\*]/.exec(topic)
    if (m) {
      throwException('illegalCharactor:' + m[1]);
    }
  }

  function checkPubTopic (topic) {
    if (!topic || !topic.length || toString.call(topic) != '[object String]' ||
          topic.indexOf('*') != -1 ||
          /\.{2}/.test(topic) ||
          topic[0] == '.' ||
          topic[topic.length] == '.') {

      illegalTopic(topic)
    }
  }

  function doCall (topic, msg, handlers, pubId) {
    //msg = msg || null;
    msg = typeof msg == 'undefined' ? null : msg;
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
      if (wrapFn && (typeof pubId === 'undefined' || wrapFn.pubId !== pubId)) {
        wrapFn.pubId = pubId;
        config = wrapFn.config;

        if (config && config._topics) {
          if (checkWait(config._topics, config.topics, topic, msg)) {
            clearWait(config._topics, config.topics);
            //try {
            setTimeout( function () {
              wrapFn.h.call(wrapFn.scope, topic, config.topics , wrapFn.data);
            }, 0 );
            //} catch ( e1 ) {}
          }
        } else {
          wrapFn.execedTime++;
          if (toString.call(wrapFn.config.execTime) == '[object Number]'
              && wrapFn.execedTime >= wrapFn.config.execTime) {
                //handlers.splice(i--,1);
                //len = handlers.length;
                handlers[i] = null;
              }
              //try {
              setTimeout( function () {
                wrapFn.h.call(wrapFn.scope, topic, msg, wrapFn.data);
              }, 0 );
              //} catch ( e2 ) {}
        }
      }
    }
  }

  function deleteWrapFn (h, id) {

    for (var i = 0, len = h.length; i < len; i++) {
      if (h[i].sid == id) {
        h[i] = null
        break
      }
    }
  }

  function match (p, t) {
    if (p == t || t == '**') {
      return true
    }

    t = t.replace(/\.\*\*\./g,'(((\\..+?\\.)*)|\\.)')
    t = t.replace(/^\*\*\./,'(.+?\\.)*')
    t = t.replace(/\.\*\*$/,'(\\..+?)*')

    t = t.replace(/\.\*\./g,'(\\..+?\\.)')
    t = t.replace(/^\*\./g,'(.+?\\.)')
    t = t.replace(/\.\*$/g,'(\\..+?)')

    if (/[^\.|\*]$/.test(t)) {
      t = t + '$'
    }

    return new RegExp(t).test(p)
  }

  function query (topic, pubItems) {
    var msgs = []
    for (var p in pubItems) {
      if (match(p, topic)) {
        msgs.push({topic: p, value: pubItems[p]})
      }
    }
    return msgs
  }

  function sub (path, handler, tree) {

    var i = 0,
      len = path.length,
      token

    for (; token = path[i++];) {
      if (i == len - 1) {
        tree.h.push(handler)
      } else {
        if (!tree.t[token]) {
          tree.t[token] = {t: {}, h:[]}
        }
        tree = tree.t[token]
      }
    }
  }

  function pub (path, index, tree, msg, topic, pubId, seed) {

    var token = path[index]

    if (index == path.length) {

      doCall(topic, msg, (seed && seed.isWildcard) ? tree.t['**'].h : tree.h, pubId)

    } else {

      if (tree.t['**']) {

        if (tree.t['**'].t[token]) {

          pub(path, index + 1, tree.t['**'].t[token], msg, topic, pubId, {index : index, tree:tree})

        } else {
          pub (path, index + 1, tree, msg, topic, pubId, {isWildcard : true})
        }
      }

      if (tree.t[token]) {

        pub(path, index + 1, tree.t[token], msg, topic, pubId)

      } else if (seed && !seed.isWildcard) {
        pub(path, ++seed.index, seed.tree, msg, topic, pubId, seed)
      }

      if (tree.t['*']) {
        pub(path, index + 1, tree.t['*'], msg, topic, pubId)
      }
    }
  }

  function _unsub (path, index, tree, id) {

    var token = path[index]

    if (index == path.length) {
      deleteWrapFn(tree.h, id)
    } else {
      if (tree.t[token]) {
        _unsub(path, ++index, tree.t[token], id)
      }
    }
  }

  function unsub (sid, tree) {

    var sid = sid.split('^')

    if (sid.length != 2) {
      throwException('illegal sid:' + sid)
    }

    var path = sid[0].split('.'),
      id = sid[1]

    _unsub(path, 0, tree, id)
  }

  function MessageBus (c) {

    c = c || {}

    this.config = applyIf(c, defaults)
    this.tree = {t:{}, h:[]}
    this.pubItems = {}
  }

  applyIf(MessageBus.prototype, {

    version: '1.0',

    subscribe: function (topic, handler, scope, data, config) {

      checkSubTopic(topic)
      checkIllegalCharactor(topic)

      scope = scope || window
      config = config || {}

      var sid = generateId(),
        wrapFn = {
          h: handler,
          scope: scope,
          data: data,
          sid: sid,
          execedTime: 0,
          config: config},
        path = topic.split('.')

      sub(path, wrapFn, this.tree)

      if (this.config.cache && !!config.cache) {

        var msgs = query(topic, this.pubItems)

        for(var i = 0, len = msgs.length; i < len; i++){
          doCall(msgs[i].topic, msgs[i].value, [wrapFn]);
        }
      }
      return topic + '^' + sid
    },

    publish: function (topic, msg) {

      checkPubTopic(topic)
      checkIllegalCharactor(topic)

      this.pubItems[topic] = msg

      var path = topic.split('.')

      pub(path, 0, this.tree, msg, topic, generateId())
    },

    unsubscribe: function (sids) {

      sids = sids.split(';')

      for (var i = 0, ids; ids = sids[i++]; ) {
        unsub(ids, this.tree)
      }
    },

    wait: function (topics, handler, scope, data, config) {

      if (toString.call(topics) !== '[object Array]' || !topics.length) {
        return
      }

      config = config || {}
      config.topics = {}
      config._topics = {}

      var sids = [],
        i = 0,
        len = topics.length,
        topic

      for (; i < len; i++) {

        topic = topics[i]

        checkPubTopic(topics[i])

        config.topics[topic] = null
        config._topics[topic] = false
      }

      for (i = 0; i < len; i++) {
        sids.push(this.subscribe(topics[i], handler, scope, data, config))
      }

      return sids.join(';')
    }
  })

  window.messagebus = new MessageBus()
  window.MessageBus = MessageBus
})(window, undefined);
