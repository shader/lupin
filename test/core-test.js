import {assert,expect} from 'chai'
import stream from 'most'
import rewire from 'rewire'
import Lux from '../src/lux'
import bus from '../src/bus'
core = rewire('../src/lux')

describe('Lux', function() {
  it('should be able to register processors', function() {
    let c = Lux({a:1}),
        f = function (state, signal) { return [state] }
    expect(() => c.register(f)).to.increase(c.processors, 'length')
  })

  it('should be able to process signals', function(done) {
    let c = Lux({a: 1}),
        f = function (state, signal) {
          return [{a: signal.a}]
        }
    c.register(f)
    c.state.slice(1,2).observe((o) => {
      expect(o).to.have.property('a').that.equals(2)
    })
      .then(() => done())
      .catch(e => done(e))

    c.signals.push({a: 2})
  })

  it('should be able to handle side-effects', function(done) {
    let c = Lux({}),
        f = function(state, signal) {
          if (signal.type == 'run')
            return [state, ['ran ' + signal.val]]
          else return ['signal: ' + signal]
        }
    c.register(f)
    c.effectors.unshift((e) => [e])
    c.signals.push({type:'run', val: 'test'})
    c.state.slice(2,3).observe(o => {
      expect(o).to.equal('signal: ran test')
    })
      .then(() => done())
      .catch(e => done(e))
  })

  it('should be able to load state', function(done) {
    let c = Lux({}),
        trace = []
    c.state
      .take(4)
      .observe(s => { trace.push(s) })
      .then(() => {
        expect(trace).to.eql([{}, {}, 2, 2])
        done()
      })
      .catch(e => done(e))
        
    setTimeout(() => c.signals.push(1), 5)
    setTimeout(() => c.load(2), 10)
    setTimeout(() => c.signals.push(1), 15)
  })

  it('can record signals')
  it('can replay signals')
  it('should keep a short log of state history')
  it('can travel back in time')
  it('can travel forward in time')
})

describe('switch', function() {
  it('should switch streams', function(done) {
    let a = bus(),
        b = bus()
    stream.just(1)
      .merge(b)
      .map(i => a.scan((acc, o) => acc+o, i))
      .switch()
      .take(5)
      .drain()
      .then(() => done())
    a.push('a')
    b.push(2)
    setTimeout(()=>a.push('b'), 0)
    a.push('c')
  })
})

describe('processSignal', function() {
  it('should reduce (state, signal) -> {state, effects}', function() {
    let r = core.__get__('processSignal')([
      (state, signal) => ([state, [signal]]),
      (state, signal) => ([{signal}, [signal[0]]])
    ]),
        state = {b:1},
        signal = 'test',
        [s, e] = r([state], signal)
    expect(s).to.have.property('signal').that.equals('test')
    expect(e).to.eql(['test', 't'])
  })
})

describe('processEffect', function() {
  let processEffect = core.__get__('processEffect')

  it('should convert an effect to signals', function(done) {
    let effect = 'one',
        effectors = [(e) => [e.length],
                     (e) => [e]]
    
    processEffect(effect, effectors)
      .reduce((acc, e) => acc.concat(e), [])
      .then(r => {
        expect(r).to.eql([3, 'one'])
      })
      .then(() => done())
      .catch(e => done(e))
  })
})
