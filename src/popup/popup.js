const api = globalThis.browser ?? globalThis.chrome;

const COMMAND_NAME = "toggle-grampanext";
const HIGHLIGHT_COLOR_KEY = "highlightColor";
const DEFAULT_HIGHLIGHT_COLOR = "#fcd34d";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const colourInput = document.querySelector("#highlight-color");
const colourValue = document.querySelector("#colour-value");
const resetButton = document.querySelector("#reset-colour");
const shortcutOutput = document.querySelector("#current-shortcut");
const shortcutButton = document.querySelector("#change-shortcut");
const status = document.querySelector("#status");

function normaliseColour(value) {
  return HEX_COLOR_PATTERN.test(value)
    ? value.toLowerCase()
    : DEFAULT_HIGHLIGHT_COLOR;
}

function showStatus(message) {
  status.textContent = message;
}

async function loadColour() {
  const result = await api.storage.local.get(HIGHLIGHT_COLOR_KEY);
  const colour = normaliseColour(result[HIGHLIGHT_COLOR_KEY]);

  colourInput.value = colour;
  colourValue.value = colour;
}

async function saveColour(colour) {
  const normalised = normaliseColour(colour);

  await api.storage.local.set({
    [HIGHLIGHT_COLOR_KEY]: normalised,
  });

  colourInput.value = normalised;
  colourValue.value = normalised;
  showStatus("Colour saved.");
}

async function loadShortcut() {
  const commands = await api.commands.getAll();
  const command = commands.find(({ name }) => name === COMMAND_NAME);

  shortcutOutput.value = command?.shortcut || "Not assigned";
}

async function openShortcutSettings() {
  if (typeof api.commands.openShortcutSettings === "function") {
    await api.commands.openShortcutSettings();
  } else {
    await api.tabs.create({
      url: "chrome://extensions/shortcuts",
    });
  }

  window.close();
}

colourInput.addEventListener("input", () => {
  colourValue.value = colourInput.value.toLowerCase();
});

colourInput.addEventListener("change", async () => {
  try {
    await saveColour(colourInput.value);
  } catch (error) {
    console.error("Could not save highlight colour.", error);
    showStatus("Could not save colour.");
  }
});

resetButton.addEventListener("click", async () => {
  try {
    await saveColour(DEFAULT_HIGHLIGHT_COLOR);
  } catch (error) {
    console.error("Could not reset highlight colour.", error);
    showStatus("Could not reset colour.");
  }
});

shortcutButton.addEventListener("click", async () => {
  try {
    await openShortcutSettings();
  } catch (error) {
    console.error("Could not open shortcut settings.", error);
    showStatus("Open the browser extension shortcut settings manually.");
  }
});

async function initialise() {
  try {
    await Promise.all([
      loadColour(),
      loadShortcut(),
    ]);
  } catch (error) {
    console.error("Could not initialise popup.", error);
    showStatus("Some settings could not be loaded.");
  }
}

void initialise();
