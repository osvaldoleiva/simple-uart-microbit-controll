const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let device;
let server;
let txCharacteristic;
let rxCharacteristic;

// Cola BLE
let queue = Promise.resolve();
function queueGattOperation(op) {
  queue = queue.then(op, op);
  return queue;
}

// -------------------------------
//  Conectar micro:bit (LOFI style)
// -------------------------------
async function connectButtonPressed() {
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [UART_SERVICE_UUID]
    });

    device.addEventListener("gattserverdisconnected", () => {
      console.log("Desconectado");
    });

    server = await device.gatt.connect();

    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    txCharacteristic = await service.getCharacteristic(UART_TX_UUID);
    await txCharacteristic.startNotifications();

    txCharacteristic.addEventListener(
      "characteristicvaluechanged",
      (e) => {
        let bytes = [];
        for (let i = 0; i < e.target.value.byteLength; i++) {
          bytes[i] = e.target.value.getUint8(i);
        }
        const str = String.fromCharCode.apply(null, bytes);
        console.log("RX:", str);
      }
    );

    rxCharacteristic = await service.getCharacteristic(UART_RX_UUID);

    console.log("micro:bit conectada");
  } catch (e) {
    console.error("Error BLE:", e);
  }
}

function sendUART(text) {
  if (!rxCharacteristic) return;

  const data = new TextEncoder().encode(text + "\n");

  queueGattOperation(() =>
    rxCharacteristic.writeValue(data)
      .then(() => console.log("TX:", text))
      .catch((err) => console.error("Error TX:", err))
  );
}

// -------------------------------
//  Controles con pointer events
// -------------------------------
function bindPress(el, action) {
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") e.preventDefault();
    sendUART(action);
    el.setPointerCapture?.(e.pointerId);
  }, { passive: false });

  const stop = (e) => {
    sendUART("STOP");
    if (e && el.hasPointerCapture?.(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };

  el.addEventListener("pointerup", stop);
  el.addEventListener("pointerleave", stop);
  el.addEventListener("pointercancel", stop);
}

const connectBtn = document.getElementById("connectBtn");

connectBtn.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") e.preventDefault();
}, { passive: false });

connectBtn.addEventListener("pointerup", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  connectButtonPressed();
});
