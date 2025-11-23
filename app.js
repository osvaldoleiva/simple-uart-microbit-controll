// UUIDs del servicio UART (mismo esquema que tu código funcional)
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // notificaciones desde micro:bit
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // escritura hacia micro:bit

let uBitDevice;
let rxCharacteristic;
let txCharacteristic;

const statusEl = document.getElementById("status");
const robotShowEl = document.getElementById("robotShow");
const logEl = document.getElementById("log");

// Cola para operaciones GATT
let queue = Promise.resolve();

function queueGattOperation(operation) {
  queue = queue.then(operation, operation);
  return queue;
}

function setStatus(msg) {
  console.log(msg);
  statusEl.textContent = "Estado: " + msg;
}

function appendLog(msg) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

async function connectButtonPressed() {
  try {
    setStatus("buscando dispositivos...");
    appendLog("Buscando micro:bit...");

    uBitDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID]
    });

    uBitDevice.addEventListener("gattserverdisconnected", onDisconnected);

    setStatus("conectando al servidor GATT...");
    const server = await uBitDevice.gatt.connect();

    setStatus("obteniendo servicio UART...");
    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    // Característica TX (micro:bit → Web) con notificaciones
    txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
    await txCharacteristic.startNotifications();
    txCharacteristic.addEventListener("characteristicvaluechanged", onTxCharacteristicValueChanged);

    // Característica RX (Web → micro:bit) para escribir comandos
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);

    setStatus("conectado a " + uBitDevice.name);
    robotShowEl.textContent = "Robot conectado";
    robotShowEl.classList.add("robotShow_connected");
    appendLog("Conectado a " + uBitDevice.name);

  } catch (error) {
    console.error(error);
    setStatus("error: " + error.message);
    appendLog("Error: " + error.message);
  }
}

function disconnectButtonPressed() {
  if (!uBitDevice) return;

  if (uBitDevice.gatt.connected) {
    uBitDevice.gatt.disconnect();
    console.log("Desconectado");
    appendLog("Desconectado manualmente");
  }
}

function onDisconnected(event) {
  const device = event.target;
  console.log(`El dispositivo ${device.name} se ha desconectado.`);
  setStatus("desconectado");
  appendLog("Dispositivo desconectado: " + device.name);
  robotShowEl.textContent = "Robot desconectado";
  robotShowEl.classList.remove("robotShow_connected");
  rxCharacteristic = null;
  txCharacteristic = null;
}

function onTxCharacteristicValueChanged(event) {
  let receivedData = [];
  for (let i = 0; i < event.target.value.byteLength; i++) {
    receivedData[i] = event.target.value.getUint8(i);
  }

  const receivedString = String.fromCharCode.apply(null, receivedData);
  console.log("RX:", receivedString);
  appendLog("RX: " + receivedString);

  // Ejemplo: si la micro:bit envía "S" cuando se agita
  if (receivedString === "S") {
    appendLog("Evento de micro:bit: agitado (shake)");
  }
}

async function sendUART(texto) {
  if (!rxCharacteristic) {
    setStatus("no hay conexión. Conecta primero la micro:bit.");
    appendLog("Intento de envío sin conexión");
    return;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(texto + "\n"); // terminador de línea

  queueGattOperation(() =>
    rxCharacteristic.writeValue(data)
      .then(() => {
        console.log("TX:", texto);
        appendLog("TX: " + texto);
      })
      .catch(error => {
        console.error("Error al enviar datos:", error);
        appendLog("Error al enviar datos: " + error.message);
      })
  );
}

/**
 * Añade comportamiento "mientras se mantiene presionado" a un botón:
 * - al presionar: envía comando
 * - al soltar: envía STOP
 */
function addPressControl(buttonId, command) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const onPress = (e) => {
    e.preventDefault();
    sendUART(command);
  };

  const onRelease = (e) => {
    e.preventDefault();
    sendUART("STOP");
  };

  // Eventos de ratón
  btn.addEventListener("mousedown", onPress);
  // Eventos táctiles (Android)
  btn.addEventListener("touchstart", onPress);

  // Soltar en cualquier parte de la ventana
  window.addEventListener("mouseup", onRelease);
  window.addEventListener("touchend", onRelease);
}

// =======================
// Enlaces de UI
// =======================

// Botones de movimiento con "mientras presiono"
addPressControl("btnUp", "UP");
addPressControl("btnDown", "DOWN");
addPressControl("btnLeft", "LEFT");
addPressControl("btnRight", "RIGHT");

// Botón DETENER manual
document.getElementById("btnStop").addEventListener("click", () => sendUART("STOP"));

// Bocina: mientras presionado = ON, al soltar = OFF
function addHornPressControl() {
  const btnHorn = document.getElementById("btnHorn");
  if (!btnHorn) return;

  const onHornPress = (e) => {
    e.preventDefault();
    sendUART("BOCINA_ON");
  };

  const onHornRelease = (e) => {
    e.preventDefault();
    sendUART("BOCINA_OFF");
  };

  btnHorn.addEventListener("mousedown", onHornPress);
  btnHorn.addEventListener("touchstart", onHornPress);
  window.addEventListener("mouseup", onHornRelease);
  window.addEventListener("touchend", onHornRelease);
}

addHornPressControl();

// Comando personalizado (solo al hacer clic)
document.getElementById("btnSendCustom").addEventListener("click", () => {
  const input = document.getElementById("customCommand");
  const cmd = input.value.trim();
  if (cmd.length > 0) {
    sendUART(cmd);
  }
});

/* ============================================
   Registro de Service Worker para PWA
   ============================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then((reg) => {
        console.log("Service Worker registrado:", reg.scope);
      })
      .catch((err) => {
        console.error("Error al registrar Service Worker:", err);
      });
  });
}
