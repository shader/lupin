import {assert,expect} from 'chai'
import stream from 'most'
import rewire from 'rewire'
import Lux from '../src/lux'
import bus from '../src/bus'
core = rewire('../src/lux')

describe('Lux', function() {
  it('should be able to register applicatives', function() {
    let c = new Lux({a:1}),
        f = function (state, action) { return {state} }
    expect(() => c.register(f)).to.increase(c.applicatives, 'length')
  })

  it('should be able to process actions', function(done) {
    let c = new Lux({a: 1}),
        f = function (state, action) {
          return {state: {a: action.a}}
        }
    c.register(f)
    c.state.slice(1,2).observe((o) => {
      expect(o).to.have.property('a').that.equals(2)
    })
      .then(() => done())
      .catch(e => done(e))

    c.actions.push({a: 2})
  })

  it('should be able to handle side-effects', function(done) {
    let c = new Lux({}), 
        f = function(state, action) {
          if (action.type == 'run')
            return {state, effects: ['ran ' + action.val]}
          else return {state: 'action: ' + action}
        }
    c.register(f)
    c.effectors.unshift((e) => [e])
    c.actions.push({type:'run', val: 'test'})
    c.state.slice(2,3).observe(o => {
      expect(o).to.equal('action: ran test')
    })
      .then(() => done())
      .catch(e => done(e))
  })

  it('should be able to load state', function(done) {
    let c = new Lux({}),
        trace = []
    c.state
      .take(4)
      .observe(s => { trace.push(s) })
      .then(() => {
        expect(trace).to.eql([{}, {}, 2, 2])
        done()
      })
      .catch(e => done(e))
        
    setTimeout(() => c.actions.push(1), 5)
    setTimeout(() => c.load(2), 10)
    setTimeout(() => c.actions.push(1), 15)
  })

  it('can record actions')
  it('can replay actions')
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

describe('processAction', function() {
  it('should reduce (state, action) -> {state, effects}', function() {
    let r = core.__get__('processAction')([
      (state, action) => ({state, effects: [action]}),
      (state, action) => ({state: {action}, effects: [action[0]]})
    ]),
        state = {b:1},
        action = 'test',
        result = r({state}, action)
    expect(result).to.have.deep.property('state.action').that.equals('test')
    expect(result).to.have.property('effects').that.eqls(['test', 't'])
  })
})

describe('processEffect', function() {
  let processEffect = core.__get__('processEffect')

  it('should convert an effect to actions', function(done) {
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
