/*
 * UNO R4 WiFi – önálló SD-kártya diagnosztika
 *
 * Bekötés:
 *   CS/SS   -> D10
 *   MOSI/DI -> D11
 *   MISO/DO -> D12
 *   SCK/CLK -> D13
 *   GND     -> GND
 */

#include <SPI.h>
#include <SD.h>

const byte SD_CS_PIN = 10;
const char* TEST_FILE = "/__sd_diagnostic.txt";

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("=== SD KARTYA DIAGNOSZTIKA ===");
  Serial.println("SPI: CS=D10, MOSI=D11, MISO=D12, SCK=D13");

  pinMode(SD_CS_PIN, OUTPUT);
  digitalWrite(SD_CS_PIN, HIGH);
  SPI.begin();
  delay(100);

  bool initialized = false;
  for (byte attempt = 1; attempt <= 3; attempt++) {
    Serial.print("SD.begin probalkozas ");
    Serial.print(attempt);
    Serial.println("/3...");

    if (SD.begin(SD_CS_PIN)) {
      initialized = true;
      break;
    }
    delay(500);
  }

  if (!initialized) {
    Serial.println("FAIL: Az SD kartya nem valaszol az SPI buszon.");
    Serial.println("Ellenorizd a negy SPI vezeteket, a kozos GND-t es a tapfeszultseget.");
    Serial.println("Ha ez a kulon teszt is FAIL, nem a fo LED program a hiba.");
    return;
  }

  Serial.println("OK: SD kartya inicializalva.");
  Serial.println("Iras/olvasas teszt indul...");

  SD.remove(TEST_FILE);
  File writeFile = SD.open(TEST_FILE, FILE_WRITE);
  if (!writeFile) {
    Serial.println("FAIL: A kartya elindult, de az ideiglenes tesztfajl nem nyithato meg irasra.");
    return;
  }

  writeFile.println("SD_DIAGNOSTIC_OK");
  writeFile.close();

  File readFile = SD.open(TEST_FILE, FILE_READ);
  if (!readFile) {
    Serial.println("FAIL: A tesztfajl nem nyithato meg visszaolvasasra.");
    return;
  }

  String content = readFile.readString();
  readFile.close();
  SD.remove(TEST_FILE);

  if (content.indexOf("SD_DIAGNOSTIC_OK") >= 0) {
    Serial.println("SUCCESS: SD kartya, SPI kapcsolat es fajlrendszer rendben mukodik.");
  } else {
    Serial.println("FAIL: Az iras sikerult, de a visszaolvasott tartalom hibas.");
  }
}

void loop() {
  // A diagnosztika csak egyszer fut le indulas utan.
}
