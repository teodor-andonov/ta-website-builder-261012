// Bounded, in-memory undo/redo for atomic edits in one canonical authoring scope.
// Snapshots contain only Card/Item trees; editor UI state and unrelated collections
// never enter this history. Every returned snapshot is independent of the source.
export function createEditorHistory({limit=40,scopes=16}={}){
  if(!Number.isInteger(limit)||limit<1||!Number.isInteger(scopes)||scopes<1)throw Error('Invalid history limits');
  const byScope=new Map();
  const copy=value=>structuredClone(value);
  const state=key=>{
    if(!key||typeof key!=='string')throw Error('A stable scope key is required');
    if(!byScope.has(key)){
      if(byScope.size>=scopes)byScope.delete(byScope.keys().next().value);
      byScope.set(key,{undo:[],redo:[]});
    }
    return byScope.get(key);
  };
  const canUndo=key=>Boolean(key&&byScope.get(key)?.undo.length);
  const canRedo=key=>Boolean(key&&byScope.get(key)?.redo.length);
  return {
    record(key,before,after,beforeSelected=null,afterSelected=null){
      if(!Array.isArray(before)||!Array.isArray(after))throw Error('History requires authoring trees');
      if(JSON.stringify(before)===JSON.stringify(after))return false;
      const target=state(key);
      target.undo.push({before:copy(before),after:copy(after),beforeSelected,afterSelected});
      if(target.undo.length>limit)target.undo.shift();
      target.redo.length=0;
      return true;
    },
    undo(key){
      if(!canUndo(key))return null;
      const target=state(key),entry=target.undo.pop();
      target.redo.push(entry);
      return {blocks:copy(entry.before),selected:entry.beforeSelected};
    },
    redo(key){
      if(!canRedo(key))return null;
      const target=state(key),entry=target.redo.pop();
      target.undo.push(entry);
      return {blocks:copy(entry.after),selected:entry.afterSelected};
    },
    canUndo,canRedo,
    clear(key){if(key)byScope.delete(key);else byScope.clear();}
  };
}
