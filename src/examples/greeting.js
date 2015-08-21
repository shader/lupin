import {Lux, stream} from 'app/lux'

let core = new Lux({})

function processGreeting(state, signal) {
  if (signal.type == 'greet') {
    return [{...state, name: signal.name}]
  }

  return [state]
}
core.register(processGreeting)

function greet(name) {
  return {type: 'greet', name}
}

core.signals.plug(
  stream.fromEvent('input', document.getElementById('source'))
    .map(e => greet(e.target.value))
)
core.signals.observe(console.log.bind(console))

core.state.observe(s => {
  console.log(s)
  document.getElementById('sink').innerHTML = 'Hello, ' + s.name + '!'
})

window.core = core
