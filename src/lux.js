import stream from 'most'
import bus from './bus'
import split from './split'

/*
Core:
  action-bus: pluggable stream of actions / events
  side-stream: stream of side-effects

Processor: (state, action) -> [state, effects]
Actor: () -> actions
Detector: event -> actions
Effector: effect -> [Promise(action)]
Renderer: state -> view
*/

function collect(acc, more) {
  return more ? (acc || []).concat(more) : acc
}

function processAction(processors) {
  return function([state], action) {
    let reduction = processors.reduce(
      ([state, effects], app) => {
        let [s, e] = app(state, action),
            res = [ s, collect(effects, e) ]
        return res
      }, [state])
    return reduction
  }
}

function processEffect(effect, effectors) {
  return stream.from(effectors)
    .map(f => f(effect))
    .chain(l => stream.from(l))
    .map(i => Promise.resolve(i))
    .await()
}

function loader(state, action) {
  if (action.type == 'lux.load') {
    return [action.state]
  }
  return [state]
}

class Lux {
  constructor(initialState) {
    this.processors = [loader]
    this.effectors = []
    this.actions = bus()

    let merged = this.actions.scan(processAction(this.processors),
                                   [initialState]),
        [state, effects] = split(merged)

    this.state = state
    this.effects = effects
      .filter(e => e !== undefined)
      .chain(l => stream.from(l))
      .multicast()
    
    let processedEffects = this.effects
        .chain(e => processEffect(e, this.effectors))
    this.actions.plug(processedEffects)
  }

  register(app) {
    this.processors.push(app)
  }

  load(state) {
    this.actions.push({type: 'lux.load', state})
  }
}

export default Lux
export {Lux, stream}
