/**
 * Created by xiaoduan on 17/3/14.
 */
'use strict'

const PENDING = 'PENDING'
const RESOLVED = 'RESOLVED'
const REJECTED = 'REJECTED'

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

        当then方法返回一个promise对象x时，令这个x为promise3，
        需要将promise3的resolve的值作为promise2的data resolve掉
     */
    resolve(x) {
        const promise = this
        if (promise.state === PENDING) {

            const then = x && x['then']
            if (x !== null && typeof x === 'object' && typeof x.then === 'function') {
                /*
                    当x为promise对象时,其实这里已经是then方法里返回的promise2的resolve了
                    此时promise2要拿到promise3的resolve出来的值作为自己的data来resolve出去，
                    那什么时候能拿到一个promise对象resolve后的data呢？当然是在这个promise对象的then方法里了~
                    所以直接执行promise3的then方法，此时的参数y就是promise3 resolve后的data，
                    在promise3的onResolved方法里执行promise2的resolve
                 */
                then.call(x, function(y) {
                    promise.resolve(y)
                }, function(r) {
                    promise.reject(r)
                })
                return
            }

            promise.state = RESOLVED
            promise.data = x
            promise.notify()
        }
    }

    reject(reason) {
        const promise = this
        promise.state = REJECTED
        promise.data = reason
        promise.notify()
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
            这里其实是个使用nextTick来达成的同步异步的统一性
         */
        setTimeout(() => {
            while (promise.defered.length) {
                const next = promise.defered.shift()
                const onResolved = next[0]
                const onRejected = next[1]
                const resolve = next[2]
                const reject = next[3]

                //这里的resolve/reject都是处理promise2的
                //和promise1不同的是，promise1的resolve在业务代码里执行，promise2的resolve在promise内部执行
                if (promise.state === RESOLVED) {
                    if (typeof onResolved === 'function') {
                        const x = onResolved(promise.data)
                        resolve(x)
                    } else {
                        //值穿透处理，如果onResolved/onRejected 不是函数，则将当前promise.data作为then返回的promise2的data进行传递
                        resolve(promise.data)
                    }

                    // resolve(onResolved.call(undefined, promise.data))
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
        setTimeout(() => {
            resolve(value + '么么哒')
        })
    }).then((value) => {
        return 'heheda'
    })
}).then((value) => {
    console.log(value)
})
