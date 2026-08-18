export type UpdateRelation='newer'|'same'|'older'|'unknown';
export function compareReleaseVersions(left?:string,right?:string):number;
export function getUpdateRelation(available?:string,installed?:string):UpdateRelation;
