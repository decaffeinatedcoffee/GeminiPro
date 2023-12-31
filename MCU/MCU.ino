#include <ArduinoJson.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h> 
#include <FastLED.h>
#include "SinricPro.h"
#include "SinricProSwitch.h"
#include <Arduino.h>
#include <EEPROM.h>

HTTPClient http;
IPAddress    apIP(10, 10, 10, 10); 
ESP8266WebServer server(80);
#define DATA_PIN    D3
#define LED_TYPE    WS2811
#define COLOR_ORDER GRB
#define NUM_LEDS    1
#define BRIGHTNESS  255
CRGB leds[NUM_LEDS];
const uint8_t switchGpio = D6;
bool settingMode = false;
int lastGstate = 0;
String lastColor;
int lastPir = 0;
int connectionattempts = 0;
bool cbtPressed = false;
const char *sssid = "GeminiPro";
const char *spassword = "gemini123";
unsigned long lastMillis = 0;
unsigned long lastFetch = 0;
bool sled = false;
String srkey ;
String srscrt;
String srID;
String deviceID;
bool pressed = false;
void setup() {
 Serial.begin(115200);
 Serial.println("[SYSTEM] System loading.");
 EEPROM.begin(512);
 String ssideeprom;
 for (int i = 0; i < 30; ++i)
 {ssideeprom += char(EEPROM.read(i));
 }String passeeprom;
 for (int i = 30; i < 80; ++i)
 {passeeprom += char(EEPROM.read(i));
 }
 for (int i = 81; i < 128; ++i)
 {deviceID += char(EEPROM.read(i));
 }
 deviceID = deviceID.c_str();
 pinMode(D1, INPUT);
 pinMode(D2, INPUT);
 pinMode(D7, INPUT);
 delay(2000);
 if(digitalRead(D7) == HIGH){
  cbtPressed = true;
  Serial.println("[SYSTEM] Setting button is pressed.");
  delay(2000);
  if(digitalRead(D7) == HIGH){
  Serial.println("[SYSTEM] Entering setting mode...");
  settingMode = true;
  }else{
  Serial.println("[SYSTEM] Setting button was released, ignoring action.");
  settingMode = false;
  }
 }
  pinMode(switchGpio, OUTPUT);
  digitalWrite(switchGpio, LOW);
 FastLED.addLeds<LED_TYPE,DATA_PIN,COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  Serial.println("[SYSTEM] System started.");
 if(settingMode == true){
  leds[0] = CRGB::Black;
  FastLED.show();
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0)); 
  WiFi.softAP(sssid, spassword);
  IPAddress myIP = WiFi.softAPIP();
  server.on("/devicestatus", handleStatus);
  server.on("/set", handleset);
  server.on("/reboot", reboot);
  server.begin();
  Serial.println("[SYSTEM] Setting mode enabled.");
  leds[0] = CRGB::Purple;
  FastLED.show();
 }else{
   Serial.println("[SYSTEM] Normal boot started.");
    leds[0] = CRGB::Black;
    FastLED.show();
    leds[0] = CRGB::Orange;
    FastLED.show();
   WiFi.hostname("GeminiPro");
   WiFi.mode(WIFI_STA);
  WiFi.begin(ssideeprom.c_str(), passeeprom.c_str());
  while (WiFi.status() != WL_CONNECTED && connectionattempts < 14) {
    delay(1000);
    connectionattempts ++;
    Serial.println("[NETWORK] Trying to connect to WiFi, attempt " + String(connectionattempts) + "/14");
  }
  if(connectionattempts == 14 && deviceID){
    leds[0] = CRGB::Black;
  FastLED.show();
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0)); 
  WiFi.softAP(sssid, spassword);
  IPAddress myIP = WiFi.softAPIP();
  server.on("/devicestatus", handleStatus);
  server.on("/wifidata", handlewifi);
  server.on("/reboot", reboot);
  server.begin();
  Serial.println("[SYSTEM] Network setting mode enabled.");
  leds[0] = CRGB::Purple;
  FastLED.show();
  settingMode = true;
    }
   fetchtokens();
   delay(200);
   SinricProSwitch& mySwitch = SinricPro[srID];   
   mySwitch.onPowerState(onPowerState);                
   SinricPro.begin(srkey, srscrt);  
   SinricPro.onConnected([](){ Serial.println("[NETWORK] Connected to SinricPro"); }); 
   SinricPro.onDisconnected([](){ Serial.println("[NETWORK] Disconnected from SinricPro"); });
   Serial.println("[SYSTEM] Boot success.");
    leds[0] = CRGB::Black;
    FastLED.show();
 }
}

void loop() {
 server.handleClient();
 if(settingMode == false){
  SinricPro.handle();
  if(millis() - lastFetch >= 2000){
    lastFetch = millis();
  fetch();
  }
  readPIR();  
  physicalSwitchStatus();
 }else{
  if(millis() - lastMillis >= 800){
   lastMillis = millis();
   if(sled == true){
    leds[0] = CRGB::Black;
    FastLED.show();
    sled = false;
    }else{
    leds[0] = CRGB::Purple;
    FastLED.show();
    sled = true;
   }
  }
 }
}
