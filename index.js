/**
 * Created by xiaoduan on 17/3/14.
 */
'use strict'

const PENDING = 0
const RESOLVED = 1
const REJECTED = 2

class Promise {
    constructor(executor) {
        const promise = this
        const resolve = promise.resolve.bind(promise)
        const reject = promise.reject.bind(promise)

        promise.state = PENDING
        promise.data = ''
        promise.defered = []

        executor(resolve, reject)
    }
    /*
        遵循Promise/A+ 规范，then方法 onResolved 或者 onRejected 返回一个值 x,
        然后x又必须经过resolve，所以这里参数直接命名为x
     */
    resolve(x) {
        const promise = this
        if (promise.state === PENDING) {
            promise.state = RESOLVED
            promise.data = x
            this.notify()
        }
    }

    reject(reason) {
        const promise = this
        promise.state = REJECTED
        promise.data = reason
        this.notify()
    }

    then(onResolved, onRejected) {
        /*
            按照规范，then方法必须返回一个新的promise对象，同时then也是上一个promise对象的一个方法
            所以 跟then直接相关的会有两个promise，这里便于理解将then返回的promise命名为promise2
            按照正常思路，then方法里应该会对当前promise.state做出不同判断，如下
            if (promise.state === PENDING) {
                promise.defered.push([onResolved, onRejected])
                ...
            }
            if (promise.state === RESOLVED) {
                onResolved(promise.data)
                ...
            }
            if (promise.state === REJECTED) {
                onRejected(promise.data)
                ...
            }
            但其实可以不论当前的promise.state是什么，
            直接把onResolved, onRejected都push到defered数组里去，
            在封装好的notify统一做判断
         */
        const promise = this
        const promise2 = new Promise((resolve, reject) => {
            /*
                这里必须要把promise2的resolve, reject一起push到数组里去，
                笔者之前的写法是promise.defered.push([onResolved, onRejected])
                然后在notify()方法直接调用promise的resolve/reject方法，是错误的！见错误注解1

                这里的参数resolve处理的是promise2的状态，
                而错误注解1那里的resolve处理的是promise1的状态
             */
            promise.defered.push([onResolved, onRejected, resolve, reject])
        })
        return promise2
    }

    notify() {
        const promise = this
        /*
            错误注解1
            const resolve = promise.resolve.bind(promise)
            const reject = promise.reject.bind(promise)
         */

        /*
            使用setTimeout是在promise1同步resolve时，直接调用notify，而此时then方法还未执行，
            还没把onResolved, onRejected都push到defered里去。
            这里其实是个nextTick操作
         */
        setTimeout(() => {
            while (promise.defered.length) {
                const next = promise.defered.shift(),
                    onResolved = next[0],
                    onRejected = next[1],
                    resolve = next[2],
                    reject = next[3]

                if (promise.state === RESOLVED) {
                    resolve(onResolved(promise.data))
                }

                if (promise.state === REJECTED) {
                    onRejected(promise.data)
                }
            }
        })
    }
}

new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(1)
    }, 1000)
}).then((value) => {
    return new Promise((resolve, reject) => {
        resolve(value + '么么哒')
    })
}).then((value) => {
    console.log(value)
})
