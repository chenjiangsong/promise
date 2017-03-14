/**
 * Created by xiaoduan on 17/3/14.
 */
class Promise {
    constructor(executor) {
        const promise = this

        promise.status = 'pending'
        promise.data = ''
        promise.onResolvedCallback = []
        promise.onRejectedCallback = []

        executor(function(value) {
            promise.resolve(value)
        }, function(reason) {
            promise.reject(reason)
        })
    }

    resolve(value) {
        console.log('resolve')
        const promise = this
        promise.status = 'resolved'
        promise.data = value
        setTimeout(() => {
            while (promise.onResolvedCallback.length) {
                const onResolved = promise.onResolvedCallback.shift()
                onResolved(promise.data)
            }
        })
    }

    reject(reason) {
        const promise = this
        promise.status = 'rejected'
        promise.data = reason
        while (promise.onRejectedCallback.length) {
            const onRejected = promise.onRejectedCallback.shift()
            onRejected(promise.data)
        }
    }

    then(onResolved, onRejected) {
        const promise = this
        console.log('then')
        // if (promise.status === 'resolved') {
        //     onResolved(promise.data)
        // }
        //
        // if (promise.status === 'rejected') {
        //     onRejected(promise.data)
        // }

        // if (promise.status === 'pending') {
        // setTimeout(() => {
            promise.onResolvedCallback.push(onResolved)
            promise.onRejectedCallback.push(onRejected)
        // })
        // }
    }

    notify() {

    }
}

const then = {
    resolved(value) {
        console.log('正确的值是：', value)
    },
    rejected(reason) {
        console.log('拒绝的理由是：', reason);
    }
}

const a = new Promise((resolve, reject) => {
    resolve(1)
}).then(then.resolved, then.rejected)
