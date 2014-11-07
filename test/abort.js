
var mux  = require('../')
var tape = require('tape')
var pull = require('pull-stream')

function id (e) { return e }

function abortStream(onAbort, onAborted) {
  return function (read) {
    return function (abort, cb) {
      if(abort && onAbort) onAbort(abort)
      read(abort, function (end, data) {
        if(end && onAborted) onAborted(end)
        cb(end, data)
      })
    }
  }
}

module.exports = function (serializer) {
  tape('stream abort', function (t) {

    var client = {
      sink: ['drainAbort']
    }

    var A = mux(client, null, serializer) ()
    var B = mux(null, client, serializer) ({
      drainAbort: function (n) {
        return pull(
          pull.take(3),
          pull.through(console.log),
          pull.collect(function (err, ary) {
            console.log(ary)
            t.deepEqual(ary, [1, 2, 3])
            t.end()
          })
        )
      }
    })

    var as = A.createStream()
    var bs = B.createStream()

    pull(as, bs, as)

    var sent = []

    pull(
      pull.values([1,2,3,4,5,6,7,8,9,10]),
      pull.asyncMap(function (data, cb) {
        setImmediate(function () {
          cb(null, data)
        })
      }),
      pull.through(sent.push.bind(sent), function (abort) {
        t.ok(sent.length < 10, 'sent is correct')
        console.log('abort', abort)
      }),
      A.drainAbort(3)
    )

  })
}

module.exports(id)
