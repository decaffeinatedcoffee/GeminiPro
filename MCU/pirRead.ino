void readPIR(){
  if(digitalRead(D2) == HIGH){
    if(lastPir != 1){
    Serial.println("[SYSTEM] Motion detected.");
    lastPir = 1;
    postServer();
  }
  }
}
