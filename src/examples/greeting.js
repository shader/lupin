import {Lux, stream} from 'app/lux'

let core = new Lux({})

function processGreeting(state, action) {
  if (action.type == 'greet') {
    return {state: {...state, name: action.name}}
  }

  return {state}
}
core.register(processGreeting)

function greet(name) {
  return {type: 'greet', name}
}

core.actions.plug(
  stream.fromEvent('input', document.getElementById('source'))
    .map(e => greet(e.target.value))
)
core.actions.observe(console.log.bind(console))

core.state.observe(s => {
  console.log(s)
  document.getElementById('sink').innerHTML = 'Hello, ' + s.name + '!'
})

window.core = core
