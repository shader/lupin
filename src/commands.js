// manage command tree
import   { GetNode, SetNode, GetValues } from './controlTree'

function CommandNode( // factory for a commandTree node
    label,  // portion of the path
    parent) // preceding node in the tree (unused)
{
  return {
    value: {
      processors: [],
      debug: false
    },
    label,
    children: {},
    getIn: GetNode,
    setIn: SetNode,
    getValues: GetValues,
    newNode: CommandNode
  }
}

export default CommandNode