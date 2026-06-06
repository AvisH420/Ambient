#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ---- pin assignments ----
#define DHT_PIN     4
#define DHT_TYPE    DHT22
#define MQ135_PIN   34

// ---- WiFi credentials ----   <<< EDIT THESE TWO LINES
const char* WIFI_SSID     = "DSPA";
const char* WIFI_PASSWORD = "Dsa#123456";

// ---- MQTT broker ----        <<< EDIT THIS LINE
const char* MQTT_HOST     = "192.168.0.112";  // your Mac's IP
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "home/room/sensors";
const char* MQTT_CLIENT_ID = "esp32-sensor-01";

// ---- timing ----
const unsigned long PUBLISH_INTERVAL_MS = 5000;  // every 5 seconds, per the brief

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient    wifiClient;
PubSubClient  mqtt(wifiClient);

unsigned long lastPublish = 0;

// ---- helpers ----
void connectWifi() {
  Serial.print("WiFi: connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print(" connected, IP=");
  Serial.println(WiFi.localIP());
}

void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  while (!mqtt.connected()) {
    Serial.print("MQTT: connecting to ");
    Serial.print(MQTT_HOST);
    Serial.print(" ... ");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" -- retrying in 2s");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("ESP32 sensor publisher starting...");

  dht.begin();
  analogReadResolution(12);

  connectWifi();
  connectMqtt();
}

void loop() {
  // keep MQTT alive; reconnect if dropped
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  // publish on interval (non-blocking timing)
  unsigned long now = millis();
  if (now - lastPublish < PUBLISH_INTERVAL_MS) return;
  lastPublish = now;

  float temp_c   = dht.readTemperature();
  float humidity = dht.readHumidity();
  int   mq_raw   = analogRead(MQ135_PIN);

  if (isnan(temp_c) || isnan(humidity)) {
    Serial.println("DHT22 read failed -- skipping this publish");
    return;
  }

  // build JSON payload
  StaticJsonDocument<200> doc;
  doc["temp"]        = temp_c;
  doc["humidity"]    = humidity;
  doc["air_quality"] = mq_raw;
  doc["uptime_ms"]   = now;

  char payload[200];
  size_t len = serializeJson(doc, payload);

  if (mqtt.publish(MQTT_TOPIC, payload, len)) {
    Serial.print("Published: ");
    Serial.println(payload);
  } else {
    Serial.println("Publish failed");
  }
}