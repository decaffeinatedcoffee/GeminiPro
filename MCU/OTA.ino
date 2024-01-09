void otasetup(){
  ArduinoOTA.setHostname(String("GeminiPro" + deviceID.substring(0,5)).c_str());
  ArduinoOTA.setPassword(spassword);
  ArduinoOTA.onStart([]() {
    Serial.println("[SYSTEM] OTA Update Started");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("[SYSTEM] OTA Update Ended, rebooting");
    delay(500);
    ESP.restart();
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[SYSTEM] Update progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("[SYSTEM] OTA Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("[SYSTEM] OTA Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("[SYSTEM] OTA Connection Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("[SYSTEM] OTA Failed Receiving Data");
    else if (error == OTA_END_ERROR) Serial.println("[SYSTEM] OTA End Failed");
  });
  ArduinoOTA.begin();
}