// lupin entry point provides stream based command managment, Immutable based state managment

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

function fetchProcessors( // find all of the processors subscribed to the event; return [ processor, ...]
    procTree,  // the tree of subscribed processors to search
    type,  // an array of the labels in the signal type  e.g.: "lupin.init" -> ["lupin", "init"] 
  ) {
  var cmdNode = procTree; 
  var procs = cmdNode._processors;  // grab the subscribers to all commmands

  for (var idx = 0; idx < type.length; idx++) {
    // march through the command type path
    if( type[ idx] in cmdNode) {
      // found the next layer of subscribers, go get'em
      cmdNode = cmdNode[ type[ idx]];
      procs = procs.concat( cmdNode._processors);
    } else {
      break;
    }
  }
  return procs;
}

function processSignal(processorTree) {
  return function([state], signal) {
    var procs = fetchProcessors( processorTree, signal._type);
    return procs.reduce(
      ([state, effects], proc) => {
        let [s, e] = proc(state, signal),
            res = [ s, collect(effects, e) ]
        return res
      }, [state])
  }
}

function processEffect(effect, effectors) {
  return stream.from(effectors)
    .map(f => f(effect))
    .chain(l => stream.from(l))
    .map(i => Promise.resolve(i))
    .await()
}

function loadState(state, signal) {
  return [signal.state]
}

function Lupin(initialState) {
  let processors = {_processors: []},
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


        load(state) {
          this.invoke({ _type: 'lupin.load', state: state})
        },

        // COMMAND PROCESSING
        // The following attributes and functions facilitate command processing
        /*
        command subscriptions are kept in a tree which might look like this:

        {
          _processors: [...],
          "lupin": {
            _processors: [...],
            "init": {
              _processors: [...],
            }
          },
          "todo":...
        }
        */


        // construct a method to invoke a new command
        command( // creat the command invocation function. Returns the function.
          path, // full pathname of the command which this function will invoke
                    // can be either a string delimited with '.' or an array of strings
                    //  e.g.: "lupin.init" or ["lupin", "init"]
          processor, // function to be invoked to execute on the subscribed command set
                     // this function must fit the signature 
                     // processor( state, command) -> [ state, effect, ...]]
          ...paramList) // array of parameter names for this command
        {

          if (typeof path === 'string') path = path.split('.')

          // subscribe this processor to the command set
          function addProcessor(tree, path, proc, depth) {
            // private function to subcribe the processor to the command
            if (path.length == depth) {
              // at the end of the path, so register here for all subtending commands
              tree._processors.push(proc);
              return
            }
            // look for it at this level in the tree.
            if (!(path[ depth] in tree)) {
              // since it is not here, add it
              tree[ path[ depth]] = {_processors: []}
            }
            // now traverse down the tree
            return addProcessor(tree[ path[ depth]], path, proc, depth+1)
          }

          // subscribe the processor to this command
          addProcessor(this.processors, path, processor, 0);
          
          // define the command generation function
          return ( ...args ) => {
            var signal = { _type: path };

            // pump the arguments into the signal object

            for ( var i=0; i < paramList.length && i < args.length; i++) {
              signal[paramList[i]]=args[i];
            }
            // call for the command
            this.invoke( signal)
          }
        },

        invoke(  // interface to issue a command for processing
          cmd) // command signal object including command:_type and parameters
        {
          // validate command object a wee bit
          if( ('_type' in cmd) && ('length' in cmd._type) && cmd._type.length > 0 ) {
            // convert the path from "lupin.init" to ["lupin","init"] form if required
            if( typeof cmd._type === 'string') {
              cmd._type = cmd._type.split('.'); 
            }
          } else {
              throw { file: "lupin", line: 156, message: "Invalid command object at invoke." }
          } 
          // actual most call to emmit the command to the stream
          this.signals.push( cmd);  
        }
      },
      processedEffects = lupin.effects.chain(e => processEffect(e, effectors))

  lupin.signals.plug(processedEffects)
  lupin.command('lupin.load', loadState, "state")
  return lupin;
}

export default Lupin
export {Lupin, stream}
