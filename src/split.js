import stream from 'most'

//Split stream of arrays into an array of streams, or a map of streams
export default function split(stream, fields=2) {
  let s = stream.multicast()
  let streams = []
  if (typeof fields == 'number') {
    for (var i=0; i<fields; i++) {
      let j = i
      streams.push(s.filter(l => l.length > j).map(o => o[j]))
    }
  } else {
    streams = {}
    fields.forEach(f => {
      streams[f] = s.map(o => o[f])
    })
  }
  return streams
}
