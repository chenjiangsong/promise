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

        当then的onResolved/onRejected返回一个promise对象x时，令这个x为promise3，
        需要将promise3的resolve的值作为promise2的data resolve掉
     */
    resolve(x) {
        const promise = this
        if (promise.state === PENDING) {
            //防止return promise1
            if (x === promise) {
                throw new TypeError('Promise settled with itself.');
            }
            /*
                这步我们先是存储了一个指向 x.then 的引用，然后测试并调用该引用，
                以避免多次访问 x.then 属性。这种预防措施确保了该属性的一致性，
                因为其值可能在检索调用时被改变。
             */
            let called = false;
            try{
                const then = x && x['then']
                if (x !== null && typeof x === 'object' && typeof x.then === 'function') {
                    /*
                        当x为promise对象时,其实这里的代码块已经是在执行then方法里返回的promise2的resolve了
                        此时promise2要拿到promise3的resolve出来的值作为自己的data来resolve出去，
                        那什么时候能拿到一个promise对象resolve后的data呢？当然是在这个promise对象的then方法里了~
                        所以直接执行promise3的then方法，此时的参数y就是promise3 resolve后的data，
                        在promise3的onResolved方法里执行promise2的resolve
                     */
                    then.call(x, function(y) {
                        if (!called) {
                            promise.resolve(y)
                        }
                        called = true
                    }, function(r) {
                        if (!called) {
                            promise.reject(r);
                        }
                        called = true;
                    })
                    return
                }
            } catch(e) {
                if (!called) {
                    promise.reject(e);
                }
                called = true;
                return
            }


            promise.state = RESOLVED
            promise.data = x
            promise.notify()
        }
    }

    reject(reason) {
        const promise = this
        if (promise.state === PENDING) {
            //防止return promise1
            if (reason === promise) {
                throw new TypeError('Promise settled with itself.');
            }
            promise.state = REJECTED
            promise.data = reason
            promise.notify()
        }
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
            // 防止异步then 手动notify
            promise.notify()
        })
        return promise2
    }

    catch(onRejected) {
        const promise = this
        return promise.then(undefined, onRejected)
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
            /*
                做个简单的状态判断，防止executor不resolve/reject时，
                永远处在PENDING状态，浪费while循环
             */
            if (promise.state !== PENDING) {
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
                            resolve(onResolved(promise.data))
                        } else {
                            //值穿透处理，如果onResolved/onRejected 不是函数，则将当前promise.data作为then返回的promise2的data进行传递
                            resolve(promise.data)
                        }
                    }
                    /*
                        根据规范，不论 promise1 被 reject 还是被 resolve 时,
                        promise2 都会被 resolve，只有出现异常时才会被 rejected。
                     */
                    if (promise.state === REJECTED) {
                        if (typeof onResolved === 'function') {
                            resolve(onRejected(promise.data))
                        } else {
                            reject(promise.data)
                        }
                    }
                }
            }
        })
    }
}

Promise.resolve = function(x) {
    return new Promise((resolve, reject) => {
        resolve(x)
    })
}

Promise.reject = function(reason) {
    return new Promise((resolve,reject) => {
        reject(reason)
    })
}
/*
    all方法：
    传递一个带有多个promise的数组作为参数，
    释放一个对应的data数组给then调用

    首先Promise.all有then方法，所以肯定返回一个promise对象，然后在executor函数里循环遍历promise数组，
    将每个promise resolve的值存到数组里，再resolve这个数组
    同样的原理，处理内部promise的resolve/reject后的值，都要调用内部promise的then方法
 */
Promise.all = function(iterable) {
    return new Promise(function(resolve, reject)  {
        const len = iterable.length
        let count = 0,
            result = []

        if (iterable.length === 0) {
            resolve(result)
        }

        iterable.foreach((promise, index) => {
            promise.then((v) => {
                count++
                result[index] = v
                if (count === len) {
                    resolve(result)
                }
            },reject)
        })
    })
}
/*
    获取最慢的promise
 */
Promise.slow = function(iterable) {
    return new Promise(function(resolve, reject) {
        const len = iterable.length
        let count = 0

        iterable.foreach((promise) => {
            promise.then((v) => {
                count++
                if (count === len) {
                    resolve(v)
                }
            },reject)
        })

    })
}
/*
    获取最快的promise，直接resolve第一个出来的就行了
 */
Promise.race = function(iterable) {
    return new Promise(function(resolve, reject) {
        const len = iterable.length
        iterable.foreach((promise) => {
            promise.then((v) => {
                resolve(v)
            }, reject)
        })
    })
}
