import {createOta2RuntimeState,reduceOta2RuntimeEvent} from "./ota2RuntimeState.mjs";
import {evaluateOta2PostVerify} from "./ota2PostVerify.mjs";
export const OTA2_NATIVE_BRIDGE_CODES=Object.freeze({
  READY:"X5600",INSTALL_API_MISSING:"X5601",STATUS_API_MISSING:"X5602",
  INSTALL_FAILED:"X5603",POSTVERIFY_FAILED:"X5604",
});
export function createOta2NativeBridge({firmwareInstallRelease,firmwareStatus,subscribeProgress}={}) {
  return Object.freeze({
    async install({version,channel,expectedVersion,onRuntime}={}) {
      if(typeof firmwareInstallRelease!=="function") return Object.freeze({ok:false,code:OTA2_NATIVE_BRIDGE_CODES.INSTALL_API_MISSING});
      if(typeof firmwareStatus!=="function") return Object.freeze({ok:false,code:OTA2_NATIVE_BRIDGE_CODES.STATUS_API_MISSING});
      let runtime=createOta2RuntimeState();
      let unlisten=null;
      if(typeof subscribeProgress==="function"){
        unlisten=await subscribeProgress((entry)=>{
          runtime=reduceOta2RuntimeEvent(runtime,entry);
          onRuntime?.(runtime);
        });
      }
      try{
        const before=await firmwareStatus(undefined,channel);
        const installStatus=await firmwareInstallRelease(version,channel);
        const after=installStatus ?? await firmwareStatus(undefined,channel);
        const postVerify=evaluateOta2PostVerify({before,after,expectedVersion});
        if(!postVerify.ok)return Object.freeze({ok:false,code:OTA2_NATIVE_BRIDGE_CODES.POSTVERIFY_FAILED,postVerify,before,after,runtime});
        return Object.freeze({ok:true,code:OTA2_NATIVE_BRIDGE_CODES.READY,postVerify,before,after,runtime});
      }catch(error){
        return Object.freeze({ok:false,code:OTA2_NATIVE_BRIDGE_CODES.INSTALL_FAILED,error:String(error?.message??error),runtime});
      }finally{
        if(typeof unlisten==="function") await unlisten();
      }
    }
  });
}
