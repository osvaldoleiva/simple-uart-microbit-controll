const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_UUID      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_UUID      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let device;
let txCharacteristic;
let rxCharacteristic;

const statusEl    = document.getElementById("status");
const robotShowEl = document.getElementById("robotShow");

function setStatus(msg) {
  console.log(msg);
  statusEl.textContent = "Estado: " + msg;
}

async function connectButtonPressed() {
  try {
    setStatus("Buscando micro:bit...");

    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [UART_SERVICE_UUID]
    });

    device.addEventListener("gattserverdisconnected", () => {
      setStatus("Desconectado");
      robotShowEl.textContent = "Robot desconectado";
    });

    const server  = await device.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    txCharacteristic = await service.getCharacteristic(UART_TX_UUID);
    await txCharacteristic.startNotifications();
    txCharacteristic.addEventListener("characteristicvaluechanged", (event) => {
      const bytes = [];
      for (let i = 0; i < event.target.value.byteLength; i++) {
        bytes.push(event.target.value.getUint8(i));
      }
      const str = String.fromCharCode.apply(null, bytes);
      console.log("RX:", str);
    });

    rxCharacteristic = await service.getCharacteristic(UART_RX_UUID);

    setStatus("Conectado a " + device.name);
    robotShowEl.textContent = "Robot conectado";

  } catch (err) {
    console.error(err);
    setStatus("Error al conectar");
  }
}

// enviar una sola vez
async function sendUART(texto) {
  if (!rxCharacteristic) {
    console.warn("No hay característica RX, conecta primero.");
    return;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto + "\n");
    await rxCharacteristic.writeValue(data);
    console.log("TX:", texto);
  } catch (err) {
    console.error("Error TX:", err);
  }
}
