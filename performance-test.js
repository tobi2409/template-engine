// --- Testdaten erzeugen ---
const N = 100000; // sehr große Liste
const items = Array.from({ length: N }, (_, i) => ({
    id: i + 1,
    name: "Item " + (i + 1),
    value: i + 1 //Math.floor(Math.random() * 1000)
}));

const root = document.getElementById("app");

const model = reactive({ items }, () => render(root, model));

// --- Initial Render ---
console.time("Initial Render");
render(model, root);
console.timeEnd("Initial Render");

//const idx = 5 //Math.floor(Math.random() * N);
//model.items[idx].value = 100 //Math.floor(Math.random() * 1000)

// --- Test Updates nach 2 Sekunden ---
setTimeout(() => {
    console.time("Update 500 Items");
    // zufällig 500 Items updaten
    for (let i = 0; i < 50000; i++) {
        const idx = Math.floor(Math.random() * N);
        model.items[idx].value = Math.floor(Math.random() * 1000);
    }
    console.timeEnd("Update 500 Items");
}, 2000);

// --- Test Hinzufügen neuer Items nach 4 Sekunden ---
setTimeout(() => {
    console.time("Add 100 Items");
    for (let i = 0; i < 100; i++) {
        const id = model.items.length + 1;
        model.items.push({ id, name: "Item " + id, value: Math.floor(Math.random() * 1000) });
    }
    console.timeEnd("Add 100 Items");
}, 4000);
