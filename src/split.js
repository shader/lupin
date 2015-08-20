import stream from 'most'

export default function split(stream, fields) {
  let streams = {},
      s = stream.multicast()
  fields.forEach(f => {
    streams[f] = s.map(o => o[f])
  })
  return streams
}
