// COMMAND PROCESSING
// The following attributes and functions facilitate command processing
/*
command subscriptions are kept in an object tree which might look like this:

{
  label: "_top",
  processors: [...],
  children: [
    lupin: {
      label: "lupin",
      processors: [...],
      children: [
        init: {
          label: "init",
          processors: [...]
        }
      ]
    },
    todo:...
}
*/


// function for getting a value in the command, observer, or log control trees
function GetNode( 
    path)  //  path = ["lupin","init"] form
{
  if( path.length) {
    var name = path[ 0]
    if (! ( name in this.children)) return null
    return this.children[name].getIn( path.slice(1));
  }
  // stepped down as far as the provided list, Return it.
  return this
} 

// fetch the values of the entire path (top to bottom) as an array
function GetValues( 
    path, //  path = ["lupin","init"] form
    getter, // method to fetch the value of a specific node
    result) // array to hold the result
{
  if ( result === undefined ) {
    result = getter( this) 
  } else {
    result = result.concat( getter (this))
  }
  if( !path.length) return result // stepped down as far as the provided list, Return it.
  var name = path[ 0]
  if (! ( name in this.children)) return result
  return this.children[name].getValues(path.slice(1), getter, result);
} 

// set a value in the command, observer, or log control trees
function SetNode( 
  path,  // path = ['lupin', 'init'] form
  setter) // function to set the content of the node
{
  if (!path.length) return setter( this) // at the requested node, set the value
  var name = path[ 0]  // save the current label
  if( !(name in this.children))  // does this object have the subtree requested?
    this.children[name] = this.newNode( name, this) // no, so create it
  return this.children[name].setIn( path.slice(1), setter)  // navigate down a layer and repeat
} 

export { GetNode, SetNode, GetValues }