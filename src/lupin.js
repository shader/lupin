// lupin entry point provides stream based command managment, Immutable based state managment
'use strict';

import stream from 'most'
import bus from './bus'
import split from './split'

import CommandNode from'./commands'
import ObserverNode from'./observers'

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



function processSignal(processorTree) {
  return function([state], signal) {
//    var procs = fetchProcessors( processorTree, signal._ctrl.type);
    var procs = processorTree.getValues( signal._ctrl.type, (node) => node.processors )
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

// convenience function to create a source object. Really just documentation of possible attribute names
function eventSource(
    type, // one of "user", "message", "antecedent", "bootstrap"    
    module, // message interface subsystem or user facing module name
    label, // optional - additional identifiers such as connection or UI control
    file, // optional - file name of the generating source code
    line, // optional - line numbe rin the source file
    antecedent, // optional, used for internally raised events to capture the prior signal source 
    timestamp  // set by the invoke call to the current date.now()
  ) {
  return { type, module, label, sourcefile, linenumber, antecedent, timestamp }
}

// convert the path ["lupin","init"] to "lupin.init"
function pathString ( path) { 
 return path.join('.')
}

function loadState(state, signal) {
  return [signal.state]
}

// create persistent log stream set from overall signal stream
// Lupin.log. [debug, status,error]
function loadLogStreams( signals) {
  return {
    logs: signals.filter((s) => ( s._ctrl.type[0]=='lupin' && s._ctrl.type[1]=='log' )).multicast(),
    debug: signals.filter((s) => 
      ( s._ctrl.type[0]=='lupin' && s._ctrl.type[1]=='log' && s._ctrl.type[2] == 'debug' )).multicast(),
    status: signals.filter((s) => 
      ( s._ctrl.type[0]=='lupin' && s._ctrl.type[1]=='log' && s._ctrl.type[2] == 'status' )).multicast(),
    error: signals.filter((s) => 
      ( s._ctrl.type[0]=='lupin' && s._ctrl.type[1]=='log' && s._ctrl.type[2] == 'error' )).multicast()
  }
}

var LupinCore


function Lupin(initialState) {
  if( LupinCore !== undefined ) return LupinCore;

  let cmdProcessors = CommandNode( "_top"),
      effectors = [],
      signals = bus(),
      merged = signals.scan(processSignal(cmdProcessors),
                            [initialState]),
      [state, effects] = split(merged),
      logStream = loadLogStreams( signals),
      observers = ObserverNode( "_top"), // observer tree is similar to the processor tree but 
                                        // holding filtered streams instead of proc pointers
     
      LupinCore = {
        cmdProcessors, signals, state, effectors, logStream, observers,
        effects: effects
          .filter(e => e !== undefined)
          .chain(l => stream.from(l))
          .multicast(),


        load(state) {
          source = { 
            type:"bootstrap", 
            module: "lupin",
            file: "lupin.js",
            line: 170
          }
          this.invoke( {_ctrl: { type: 'lupin.load', source}, state})
        },

        // construct a method to invoke a new command
        command( // creat the command invocation function. Returns the function.
          cmdPath, // full pathname of the command which this function will invoke
                    // can be either a string delimited with '.' or an array of strings
                    //  e.g.: "lupin.init" or ["lupin", "init"]
          processor) // function to be invoked to execute on the subscribed command set
                     // this function must fit the signature 
                     // processor( state, command) -> [ state, effect, ...]]
        {
          // convert the path from "lupin.init" to ["lupin","init"] if required
          var path = (typeof cmdPath === 'string') ? cmdPath.split('.') : cmdPath;

           // subscribe the processor to this command
          cmdProcessors.setIn( path, processor);
          
          // define the command generation function and return it
          return ( parameters, source ) => {
            var signal
            if ( arguments.length > 1) {
              signal = Object.assign( { _ctrl: {type: path, source } }, parameters);
            } else {
              signal = Object.assign({ _ctrl: {type: path } }, parameters);
            }

            // call for the command
            this.invoke( signal)  // the source is the last argument
          }
        },

        invoke(  // interface to issue a command for processing
          cmd, // command signal object including command:_type and parameters
          source)  // source trace object
        {
          // validate command object a wee bit
          if( ('_ctrl' in cmd) && cmd._ctrl.type.length > 0 ) {
            // convert the path from "lupin.init" to ["lupin","init"] form if required
            if( typeof cmd._ctrl.type === 'string') {
              cmd._ctrl.type = cmd._ctrl.type.split('.'); 
            }
          } else {
              throw { file: "lupin", line: 213, message: "Invalid command object at invoke." }
          } 

          if( arguments.length > 1) {
            cmd._ctrl.source = source;
          } else if (cmd._ctrl.source === undefined ) {
            cmd._ctrl.source = {};
          }
          cmd._ctrl.source.timestamp = Date.now();
          // actual most call to emmit the command to the stream
          this.signals.push( cmd);  
        },

        observe( // establish and connect a state observation stream
          statePath,  // path selecting sub tree of the state for observation
          observer   // function observer( stateSubtree)  return value is ignored
        ) {
          // convert the path from "lupin.init" to ["lupin","init"] if required
          var path = (typeof statePath === 'string') ? statePath.split('.') : statePath;

          observers.setIn( path, observer)
        },

        // logs are just signals in the name space 'lupin.log.[debug, error, status].level'
        log( // generate a log
          mode, // one of "debug", "status", or "error"
          source,
              /* source = {
                module, // message interface subsystem or user facing module name
                file, // optional - file name of the generating source code
                line, // optional - line numbe rin the source file
                antecedent, // internally raised events capture the prior signal source 
                timestamp  // set by the invoke call to the current date.now()
              } */
          ...args)  // anything console.log will take
        {
          this.invoke( {_ctrl: { type: [ 'lupin', 'log', mode], source}, parameters: args})
        },

        debugSet(  // define the command messages which will be pushed to the log stream
          cmdpath, // command path to filter
          level)  // debug level for these logs
        {
          // convert the path from "lupin.init" to ["lupin","init"] if required
          var path = (typeof cmdPath === 'string') ? cmdPath.split('.') : cmdPath;

          this.debugLogControl.setIn( path, level)
        },

        debugClear(  // discontinue logging command messages 
          cmdPath )   // for the path specified
        {
          // convert the path from "lupin.init" to ["lupin","init"] if required
          var path = (typeof cmdPath === 'string') ? cmdPath.split('.') : cmdPath;

          var node = this.debugLogControl.getIn( path);
          if( node.debugLevel < node.minLevel) {
            for ( var child in this.children) {
              child.updateMinLevel( level)
            }
          }
        },

        // convenience function to create a log listener
        logSubscribe(
          logFunction, // function to subscribe e.g.: console.log.bind(console)
          mode) // one of "debug", "status", or "error"
        {
          this.logStream[mode].observe( logFunction)
        } 
      },

      processedEffects = LupinCore.effects.chain(e => processEffect(e, effectors))

  LupinCore.observers.stream = LupinCore.state;
  LupinCore.signals.plug(processedEffects)
  LupinCore.command('lupin.load', loadState)
  return LupinCore;
}

export default Lupin
export {Lupin, stream}
