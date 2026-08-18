export interface Ota2RecoveryDescriptor { backupId:string; count:number; revision:number|null; checksum:string; }
export function createOta2RecoveryCoordinator(input?:Record<string,unknown>):Readonly<{prepare():Promise<Ota2RecoveryDescriptor>}>;
