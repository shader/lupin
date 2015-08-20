import assert from 'assert'
import stream from 'most'
import split from '../src/split'

describe('split', function() {
  it('should split a simple stream of objects into separate streams', function (done) {
    let s = stream.from([{a:1,b:'a'}, {a:2,b:'b'}, {a:3, b:'c'}])

    let {a,b} = split(s, ['a', 'b'])
    let first = a.reduce((a,b)=>a+b, 0).then((result) => {
      assert.equal(result, 6)
    })
    let second = b.reduce((a,b)=>a+b, '').then((result) => {
      assert.equal(result, 'abc')
    })

    Promise.all([first,second]).then(() => done())
  })
})
