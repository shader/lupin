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
    let c = 0
    let res = applicatives.reduce(
      (acc, app) => {
        let {state, effects} = app(acc.state, action),
            res = {
              state,
              effects: collect(acc.effects, effects)
            }
        //console.log(c++ + ' ' + JSON.stringify(acc))
        return res
      }, {state})
    return res
  }
}

/*
for functions of the form (state, action, cb) => cb(state, effects)
*/
function act(apps) {
  return function (state, action) {
    function outer(rest) {
      if (rest) {
        return function inner(state, effects) {
          return rest[0](state, action, outer(rest.slice(1)))
        }
      } else {
        return
      }
    }
    return outer(apps)(state)
  }
}

function processEffect(effect, effectors) {
  return stream.from(effectors)
    .map(f => f(effect))
    .chain(l => stream.from(l))
    .map(i => Promise.resolve(i))
    .await()
}

export class Lux {
  constructor(initialState) {
    this.applicatives = []
    this.effectors = []
    this._init = bus()
    this.actions = bus()

    let merged = stream.just(initialState)
        .merge(this._init)
        .map(s => this.actions.scan(processAction(this.applicatives),
                                    {state: s}))
        .switch(),
        s = split(merged, ['state', 'effects'])

    this.state = merged.map(o => o.state)
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
    this._init.push(state)
  }
}

export default Lux
