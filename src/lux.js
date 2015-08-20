import stream from 'most'
import bus from './bus'
import split from './split'

/*
Core:
  action-bus: pluggable stream of actions / events
  side-stream: stream of side-effects

Applicative: (state, action) -> {state, effects}
Actor: () -> actions
Detector: event -> actions
Effector: effect -> [Promise(action)]
Renderer: state -> view
*/

function collect(acc, more) {
  return more ? (acc || []).concat(more) : acc
}

function processAction(applicatives) {
  return function({state}, action) {
    let reduction = applicatives.reduce(
      (acc, app) => {
        let {state, effects} = app(acc.state, action),
            res = {
              state,
              effects: collect(acc.effects, effects)
            }
        return res
      }, {state})
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
    return {state: action.state}
  }
  return {state}
}

class Lux {
  constructor(initialState) {
    this.applicatives = [loader]
    this.effectors = []
    this.actions = bus()

    let merged = this.actions.scan(processAction(this.applicatives),
                                   {state: initialState}),
        s = split(merged, ['state', 'effects'])

    this.state = s.state
    this.effects = s.effects
      .filter(e => e !== undefined)
      .chain(l => stream.from(l))
      .multicast()
    
    let processedEffects = this.effects
        .chain(e => processEffect(e, this.effectors))
    this.actions.plug(processedEffects)
  }

  register(app) {
    this.applicatives.push(app)
  }

  load(state) {
    this.actions.push({type: 'lux.load', state})
  }
}

export default Lux
export {Lux, stream}
