const api = globalThis.browser ?? globalThis.chrome;

const COMMAND_NAME = "toggle-grampanext";
const HIGHLIGHT_COLOR_KEY = "highlightColor";
const DEFAULT_HIGHLIGHT_COLOR = "#fcd34d";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const colourField = document.querySelector("#colour-field");
const colourCursor = document.querySelector("#colour-cursor");
const hueInput = document.querySelector("#hue");
const colourValue = document.querySelector("#colour-value");
const colourPreview = document.querySelector("#colour-preview");
const resetButton = document.querySelector("#reset-colour");
const shortcutOutput = document.querySelector("#current-shortcut");
const shortcutButton = document.querySelector("#change-shortcut");
const status = document.querySelector("#status");

let colour = { hue: 43, saturation: 96, lightness: 65 };
let isDragging = false;

function normaliseColour(value) {
  return HEX_COLOR_PATTERN.test(value) ? value.toLowerCase() : DEFAULT_HIGHLIGHT_COLOR;
}

function hexToHsl(hex) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0, lightness: Math.round(lightness * 100) };

  const [red, green, blue] = channels;
  let hue = max === red ? (green - blue) / delta : max === green ? 2 + (blue - red) / delta : 4 + (red - green) / delta;
  hue = ((hue * 60) + 360) % 360;
  const saturation = delta / (1 - Math.abs((2 * lightness) - 1));
  return { hue: Math.round(hue), saturation: Math.round(saturation * 100), lightness: Math.round(lightness * 100) };
}

function hslToHex({ hue, saturation, lightness }) {
  const chroma = (1 - Math.abs((2 * lightness / 100) - 1)) * saturation / 100;
  const segment = hue / 60;
  const match = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, match, 0] : segment < 2 ? [match, chroma, 0] : segment < 3 ? [0, chroma, match] : segment < 4 ? [0, match, chroma] : segment < 5 ? [match, 0, chroma] : [chroma, 0, match];
  const offset = lightness / 100 - chroma / 2;
  return `#${[red, green, blue].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function currentColour() { return hslToHex(colour); }

function drawColourField() {
  const context = colourField.getContext("2d");
  const { width, height } = colourField;
  const base = context.createLinearGradient(0, 0, width, 0);
  base.addColorStop(0, "#fff");
  base.addColorStop(1, `hsl(${colour.hue} 100% 50%)`);
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "#000");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
}

function renderColour() {
  const hex = currentColour();
  hueInput.value = colour.hue;
  colourValue.value = hex;
  colourPreview.style.backgroundColor = hex;
  colourCursor.style.left = `${colour.saturation}%`;
  colourCursor.style.top = `${100 - colour.lightness}%`;
  colourField.setAttribute("aria-valuetext", hex);
  drawColourField();
}

function setColour(hex) {
  colour = hexToHsl(normaliseColour(hex));
  renderColour();
}

function showStatus(message) { status.textContent = message; }

async function saveColour(hex = currentColour()) {
  const normalised = normaliseColour(hex);
  await api.storage.local.set({ [HIGHLIGHT_COLOR_KEY]: normalised });
  setColour(normalised);
}

function setFieldColour(event) {
  const bounds = colourField.getBoundingClientRect();
  colour.saturation = Math.round(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)) * 100);
  colour.lightness = Math.round((1 - Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))) * 100);
  renderColour();
}

async function loadColour() {
  const result = await api.storage.local.get(HIGHLIGHT_COLOR_KEY);
  setColour(result[HIGHLIGHT_COLOR_KEY]);
}

async function loadShortcut() {
  const commands = await api.commands.getAll();
  const command = commands.find(({ name }) => name === COMMAND_NAME);
  shortcutOutput.value = command?.shortcut || "Not assigned";
}

async function openShortcutSettings() {
  if (typeof api.commands.openShortcutSettings === "function") await api.commands.openShortcutSettings();
  else await api.tabs.create({ url: "chrome://extensions/shortcuts" });
  window.close();
}

colourField.addEventListener("pointerdown", (event) => {
  isDragging = true;
  colourField.setPointerCapture(event.pointerId);
  setFieldColour(event);
});
colourField.addEventListener("pointermove", (event) => { if (isDragging) setFieldColour(event); });
colourField.addEventListener("pointerup", async (event) => {
  if (!isDragging) return;
  isDragging = false;
  setFieldColour(event);
  try { await saveColour(); } catch (error) { console.error("Could not save highlight colour.", error); showStatus("Could not save colour."); }
});
colourField.addEventListener("keydown", async (event) => {
  const step = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowLeft") colour.saturation = Math.max(0, colour.saturation - step);
  else if (event.key === "ArrowRight") colour.saturation = Math.min(100, colour.saturation + step);
  else if (event.key === "ArrowUp") colour.lightness = Math.min(100, colour.lightness + step);
  else if (event.key === "ArrowDown") colour.lightness = Math.max(0, colour.lightness - step);
  else return;
  event.preventDefault();
  renderColour();
  try { await saveColour(); } catch (error) { console.error("Could not save highlight colour.", error); showStatus("Could not save colour."); }
});

hueInput.addEventListener("input", () => { colour.hue = Number(hueInput.value); renderColour(); });
hueInput.addEventListener("change", async () => {
  try { await saveColour(); } catch (error) { console.error("Could not save highlight colour.", error); showStatus("Could not save colour."); }
});

colourValue.addEventListener("input", () => {
  if (HEX_COLOR_PATTERN.test(colourValue.value)) setColour(colourValue.value);
});
colourValue.addEventListener("change", async () => {
  try { await saveColour(colourValue.value); } catch (error) { console.error("Could not save highlight colour.", error); showStatus("Could not save colour."); }
});

resetButton.addEventListener("click", async () => {
  try { await saveColour(DEFAULT_HIGHLIGHT_COLOR); } catch (error) { console.error("Could not reset highlight colour.", error); showStatus("Could not reset colour."); }
});
shortcutButton.addEventListener("click", async () => {
  try { await openShortcutSettings(); } catch (error) { console.error("Could not open shortcut settings.", error); showStatus("Open the browser extension shortcut settings manually."); }
});

async function initialise() {
  renderColour();
  try { await Promise.all([loadColour(), loadShortcut()]); }
  catch (error) { console.error("Could not initialise popup.", error); showStatus("Some settings could not be loaded."); }
}

void initialise();
