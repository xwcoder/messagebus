MessageBus
==========

一个简单的消息总线

## 简介 ##

一个简单的消息总线——广播方式，用于组件间的通信。对基于事件绑定的通信方式进行解耦。
支持简单的消息订阅和发布, 支持通配符订阅, **支持先发布后订阅**。

(v1使用类方式，但真心不建议使用太多条消息总线)

## 主题格式 ##

以'.'作为分隔符的字符串，支持'\*'和'\*\*'作为通配符；类似Java中
包的写法，如：com.github.xwcoder。不能含有如下符号^ 。 

'\*'通配一级且仅通配一级目录  
'\*\*'通配0或N级目录

com.\*.xwcoder、  com.github.\*、  \*.github.xwcoder都匹配com.github.xwcoder  
\*\*、  com.\*\*、 匹配com.github.xwcoder

## api ##

### 全局总线 ###
window.MessageBus。所有消息的订阅和发布动作都通过window.MessageBus。window.MessageBus 默认使用后订阅模式，不能更改。    
可以定义私有消息总线: var mb = new MessageBus({cache : boolean});

总线提供1个构造方法和5个实例方法,如下。

### <del>setConfig</del> ###
<del>MessageBus.setConfig({cache:boolean})。目前只支持一个参数cache, true:支持后订阅模式, false:不支持后订阅模式, 默认为true。</del>

### Message(config) ###
构造函数，通过config设置配置项，目前只有一个参数cache:是否支持后订阅模式。{cache:boolean}

### publish ###
MessageBus.publish(topic, msg)。在某个主题发布消息。

topic : 主题。如com.github.xwcoder, 不能含有通配符。  
msg : 发布的消息内容。可以是任何类型。

### subscribe ###
MessageBus.subscribe(topic, handler, scope, data, config)。订阅某主题。

topic : 主题。如com.github.xwcoder, 可以含有通配符。  
handler : function. 当有消息在订阅上发布时的处理函数。function(topic, msg, data){//doSomething}
+   topic : 发布消息的主题
+   msg : 发布的消息内容
+   data : 订阅时传递的数据

scope : handler执行的作用域，默认是window。  
data : 可以用来给handler传递数据。   
config : {cache : boolean, execTime : number}。cache: 订阅是否支持订阅模式, 默认是false。execTime : 执行几次, 默认无限次

此方法有一个返回值sid, 一个唯一的字符串标识本次订阅。用于取消订阅。

### unsubscribe ###
MessageBus.unsubscribe(sid)。取消某次订阅。

sid : subscribe方法的返回值。

### wait ###
MessageBus.wait(topics, handler, scope, data, config)。等待多个消息都到达才执行handler。

topics : 主题数组。['com.github.xwcoder.sleep', 'com.github.xwcoder.eat']  
handler : 同subscribe方法。  
scope : 同subscribe方法。  
data : 同subscribe方法。  
config : {cache : boolean} 同subscribe方法相比，不支持execTime。可以使用此方法返回的sid进行退订。

此方法有一个返回值sid, 一个唯一的字符串标识本次订阅。用于取消订阅。

##文件说明##
<del>messagebus-v1.js、 messagebus-v2.js ：是同一版本的不同写法。</del>      
<del>demo-v1.html、demo-v2.html ：demo页面。</del>   
<del>目前测试时只使用messagebus-v2.js，所以v2比v1靠谱</del>
v1是最新版本：1、使用类方式 2、删除了setConfig方法 3、增加wait方法 4、暴露query方法
