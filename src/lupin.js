import stream from 'most'
import bus from './bus'
import split from './split'

/*
Core:
  signal-stream: pluggable stream of signals
  side-stream: stream of side-effects

Processor: (state, signal) -> [state, effects]
Signal(er?): () -> signal
Detector: event -> signals
Effector: effect -> [Promise(signal)]
Renderer: state -> view
*/

function collect(acc, more) {
  return more ? (acc || []).concat(more) : acc
}

function processSignal(processors) {
  return function([state], signal) {
    let reduction = processors.reduce(
      ([state, effects], app) => {
        let [s, e] = app(state, signal),
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

function loader(state, signal) {
  if (signal.type == 'lupin.load') {
    return [signal.state]
  }
  return [state]
}

function Lupin(initialState) {
  let processors = [loader],
      effectors = [],
      signals = bus(),
      merged = signals.scan(processSignal(processors),
                            [initialState]),
      [state, effects] = split(merged),

      lupin = {
        processors, signals, state, effectors,
        effects: effects
          .filter(e => e !== undefined)
          .chain(l => stream.from(l))
          .multicast(),

        register(app) {
          this.processors.push(app)
        },

        load(state) {
          this.signals.push({type: 'lupin.load', state})
        }
      },
      processedEffects = lupin.effects
      .chain(e => processEffect(e, effectors))

  lupin.signals.plug(processedEffects)
  return lupin
}

export default Lupin
export {Lupin, stream}
