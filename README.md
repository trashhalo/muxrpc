# muxrpc

combined rpc and multiplexing, with pull-streams.

[![build status](https://secure.travis-ci.org/ssbc/muxrpc.png)](http://travis-ci.org/ssbc/muxrpc)


## example

``` js

var MRPC = require('muxrpc')
var pull = require('pull-stream')

//we need a manifest of methods we wish to expose.
var manifest = {
  //async is a normal async function
  hello: 'async',

  //source is a pull-stream (readable)
  stuff: 'source'

  //TODO: sink and duplex pull-streams
}

//the actual methods which the server exposes
var api = {
  hello: function (name, cb) {
    cb(null, 'hello, ' + name + '!')
  },
  stuff: function () {
    return pull.values([1, 2, 3, 4, 5])
  }
}
//pass the manifests into the constructor, and then pass the local api object you are wrapping
//(if there is a local api)
var client = MRPC(manifest, null) () //MRPC (remoteManifest, localManifest) (localApi)
var server = MRPC(null, manifest) (api)
```
now set up a server, and connect to it...
```
var net = require('net')

net.createServer(function (stream) {
  stream = toPull.duplex(stream) //turn into a pull-stream
  //connect the output of the net stream to the muxrpc stream
  //and then output of the muxrpc stream to the net stream
  pull(stream, server.createStream(), stream)
}).listen(8080)
//connect a pair of duplex streams together.

var stream = toPull.duplex(net.connect(8080))
pull(stream, client.createStream(onClose), stream)

function onClose () {
  console.log('connected to muxrpc server')
}

//now you can call methods like this.

client.hello('world', function (err, value) {
  if(err) throw err
  console.log(value)
  // hello, world!
})

pull(client.stuff(), pull.drain(console.log))
// 1
// 2
// 3
// 4
// 5
```

## Api: createMuxrpc (remoteManifest, localManifest, localApi, id, perms, codec, legacy) => rpc

`remoteManifest` the manifest expected on the remote end of this connection.
`localManifest` the manifest of the methods we are exposing locally.
`localApi` the actual methods we are exposing - this is on object with function with call types
that match the manifest.

`id` a string identifing the _remote_ identity. `muxrpc` only knows the name of it's friend
but not it's own name.

`perms` a permissions object with `{test: function (path, type, args) {} }` function.

`codec` stream encoding. defaults to [packet-stream-codec](https://github.com/ssbc/packet-stream-codec)

`legacy` engage legacy mode.

### rpc

an [EventEmitter](https://devdocs.io/node/events#events_class_eventemitter)
containing proxies for all the methods defined in your manifest, as well as the following:

* `stream`
* `createStream` method, **only if `legacy` mode**
* `id` (string, the id of the remote)
* `_emit` emit an event locally.
* `closed` a boolean, wether the instance is closed.
* `close` an async method to close this connection, will end the `rpc.stream`

And every method provided in the manifest. If a method in the manifest has the same
name as a built in, the built in will override the manifest, and you will not be able
to call that remove method.

## Manifest

`muxrpc` works with async functions, sync functions, and pull-streams.
But that javascript is dynamic, we need to tell muxrpc what sort of method
should be at what api, that is what the "mainfest" is for.
The manifest is simply an object mapping a key to one of the strings "sync" "async" "source" "sink" or "duplex",
or a nested manifest.

``` js
{
  foo: 'async',        //a function with a callback.
  bar: 'sync',         //a function that returns a value
                       //(note this is converted to an async function for the client)
  allTheFoos: 'source' //a source pull-stream (aka, readable)
  writeFoos: 'sink',   //a sink pull-stream (aka, writable)
  fooPhone: 'duplex',  //a duplex pull-stream

  //create nested objects like this:
  bar: {
    ...
  }
}

```

## Permissions

muxrpc includes a helper module for defining permissions.
it implements a simlpe allow/deny list to define permissions for a given connection.

``` js

var Permissions = require('muxrpc/permissions')

var manifest = {
  foo: 'async',
  bar: 'async',
  auth: 'async'
}

//set initial settings
var perms = Perms({allow: ['auth']})

var rpc = muxrpc(null /* no remote manifest */, manifest, serializer)({
  foo: function (val, cb) {
    cb(null, {okay: 'foo'})
  },
  bar: function (val, cb) {
    cb(null, {okay: 'bar'})
  },
  auth: function (pass) {
    //implement an auth function that sets the permissions,
    //using allow or deny lists.

    if(pass === 'whatever')
      perms({deny: ['bar']}) //allow everything except "bar"
    else if(pass === 's3cr3tz')
      perms({}) //allow everything!!!
    else return cb(new Error('ACCESS DENIED'))

    //else we ARE authorized.
    cb(null, 'ACCESS GRANTED')
  }
}, perms) //pass the perms object to the second argument of the constructor.

//Get a stream to connect to the remote. As in the above example!
var ss = rpc.createStream()

```


## License

MIT


