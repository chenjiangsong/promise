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
        
    }

    reject(reason) {

    }

    then(onResolved, onRejected) {

    }

    notify() {

    }
}