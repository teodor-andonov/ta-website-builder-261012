import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseRelease} from '../scripts/rehearse-release.mjs';

test('M11 full backup/build/package/restore rollback drill is reproducible and non-destructive',{timeout:40000},async()=>{
 const result=await rehearseRelease();
 assert.ok(result.snapshotFiles>=5);
 assert.ok(result.publicFiles>=20);
 assert.ok(result.zipBytes>0);
 assert.equal(result.recoveredZipMatches,true);
 assert.equal(result.failedBuildRetainedLastGood,true);
 assert.equal(result.existingWorkingFolderUntouched,true);
 assert.equal(result.indexable,true);
});
