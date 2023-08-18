bool onPowerState(const String &deviceId, bool &state) {
  if(state != lastGstate){
  changeDeviceState();    
  }        
  return true;                              
}
