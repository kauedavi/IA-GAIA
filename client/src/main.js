const modules = [
  "./platform/platform.js",
  "./data/appData.js",
  "./core/utils.js",
  "./core/storage.js",
  "./features/assistant.js",
  "./map/map2d.js",
  "./features/schedule.js",
  "./features/forms.js",
  "./features/auth.js",
  "./features/agenda.js",
  "./features/unit.js",
  "./map/map3d.js",
  "./bootstrap.js"
];

loadModules(modules).catch((error) => {
  console.error("Falha ao carregar os módulos do H.A.R.I.", error);
  document.body.innerHTML = `
    <main style="padding:2rem;font-family:system-ui">
      <h1>Não foi possível iniciar o H.A.R.I.</h1>
      <p>Recarregue a página. Se o problema continuar, consulte o console do navegador.</p>
    </main>
  `;
});

function loadModules(paths) {
  return paths.reduce(
    (chain, path) => chain.then(() => loadClassicScript(path)),
    Promise.resolve()
  );
}

function loadClassicScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, import.meta.url).href;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Módulo não carregado: ${path}`));
    document.head.append(script);
  });
}
