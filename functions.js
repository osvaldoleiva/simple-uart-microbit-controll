// Estados (si luego quieres usarlos)
let up_state = false;
let down_state = false;
let left_state = false;
let right_state = false;

// Esta función la llama el HTML / script de index
function buttonPressed(action) {
  // solo mapeamos nombres de acción -> texto que mandamos
  if (action === "up")     sendUART("UP");
  if (action === "down")   sendUART("DOWN");
  if (action === "left")   sendUART("LEFT");
  if (action === "right")  sendUART("RIGHT");
  if (action === "horn")   sendUART("HORN");
  if (action === "stop")   sendUART("STOP");
}

/* Opcional: soporte de teclado
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp")    sendUART("UP");
  if (e.key === "ArrowDown")  sendUART("DOWN");
  if (e.key === "ArrowLeft")  sendUART("LEFT");
  if (e.key === "ArrowRight") sendUART("RIGHT");
});

document.addEventListener("keyup", () => {
  sendUART("STOP");
});
*/
