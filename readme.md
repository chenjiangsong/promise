# promise运作过程解析

首先我们来看一个完整的promise处理异步流程的例子，
为方便讲解，这里的代码和讲解只介绍resolve的流程，reject的流程跟resolve类似。

```js
new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(1)
    })
}).then((value) => {
    console.log(value) // 1
    return value + 1
}).then((value) => {
    console.log(value) //2
})
```

我们先将代码分解

```js
const executor = function(resolve, reject) {
    async(resolve)
}

const async = function(resolve) {
    setTimeout(() => {
        resolve(1)
    })
}

const thenResolved = function(value) {
    console.log(value) //1
    return value + 1
}

const promise1 = new Promise(executor)
const promise2 = promise1.then(thenResolved)
promise2.then((value) => {
    console.log(value) // 2
})

```
过程如下：
1. 创建promise1实例，并执行executor(),发现resolve在async里，而async是异步函数，
先放到事件队列里去，等同步过程结束后再调用async来resolve改变promise1.state

2. 执行promise1.then(),此时promise1.state还是PENDING，then()返回promise2，promise2的'executor'立即执行，这个'executor'函数就是'将thenResolved函数push到promise1的defered数组里去'

3. 同步过程结束，开始执行异步过程，执行async里resolve，改变promise1的状态由PENDING为RESOLVED后,执行promise1.notify()

4. notify()依次执行defered里的回调函数onResolved(onRejected),并将onResolved的返回值作为promise2的data，resolve出来

5. 所以最后promise2的then方法里resolve的参数value就是promise2里的返回值，以此类推，每一个then方法里的value都应该是被属于它的promise的resolve的data
