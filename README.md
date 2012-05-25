MessageBus
==========

一个简单的消息总线

## 简介 ##

一个简单的消息总线——广播方式，用于组件间的通信。对基于事件绑定的通信方式进行解耦。
支持简单的消息订阅和发布, 支持通配符订阅, **支持先发布后订阅**。

## 主题格式 ##

以'.'作为分隔符的字符串，支持'\*'和'\*\*'作为通配符，'\*\*'后不能再有字符；类似Java中
包的写法，如：com.github.xwcoder。不能含有如下符号^ 。 

'\*'通配一个部分  
'\*\*'通配余下的所有部分

com.\*.xwcoder、  com.github.\*、  \*.github.xwcoder都匹配com.github.xwcoder  
\*\*、  com.\*\*、 匹配com.github.xwcoder

## api ##

### 全局总线 ###
window.MessageBus。所有消息的订阅和发布动作都通过window.MessageBus。总线提供4个方法,如下。

### setConfig ###
MessageBus.setConfig({cache:boolean})。目前只支持一个参数cache, true:支持后订阅模式, false:不支持后订阅模式, 默认为true。

### publish ###
MessageBus.publish(topic, msg)。在某个主题发布消息。

topic : 主题。如com.github.xwcoder, 不能含有通配符。  
msg : 发布的消息内容。可以是任何类型。

### subscribe ###
MessageBus.subscribe(topic, handler, scope, data, cache)。订阅某主题。

topic : 主题。如com.github.xwcoder, 可以含有通配符。  
handler : function. 当有消息在订阅上发布时的处理函数。function(topic, msg, data){//doSomething}
+   topic : 发布消息的主题
+   msg : 发布的消息内容
+   data : 订阅时传递的数据

scope : handler执行的作用域，默认是window。  
data : 可以用来给handler传递数据。   
cache : 订阅是否支持订阅模式, 默认是false。

此方法有一个返回值sid, 一个唯一的字符串标识本次订阅。用于取消订阅。

### unsubscribe ###
MessageBus.unsubscribe(sid)。取消某次订阅。

sid : subscribe方法的返回值。

##文件说明##
MessageBus-v1.js、 MessageBus-v2.js ：是同一版本的不同写法。  
demo-v1.html、demo-v2.html ：demo页面
