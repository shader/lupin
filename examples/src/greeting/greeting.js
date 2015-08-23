import {Lupin, stream} from 'lupin'

let core = Lupin({})

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

//from ui to signals / state processing
core.signals.plug(
  stream.fromEvent('input', document.getElementById('source'))
    .map(e => greet(e.target.value))
)

//from signals to console
core.signals.observe(console.log.bind(console))

//from state to ui
core.state.observe(s => {
  console.log(s)
  document.getElementById('sink').innerHTML = 'Hello, ' + s.name + '!'
})

window.core = core
