/** Attend que Chrome expose réellement son endpoint DevTools. */
export async function attendreCiblesChrome(port, delaiMs = 15_000) {
  const limite = Date.now() + delaiMs;
  let derniereErreur;

  while (Date.now() < limite) {
    try {
      const reponse = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (reponse.ok) return await reponse.json();
      derniereErreur = new Error(`HTTP ${reponse.status}`);
    } catch (erreur) {
      derniereErreur = erreur;
    }
    await new Promise((resoudre) => setTimeout(resoudre, 250));
  }

  throw new Error(
    `Chrome n'a pas ouvert le port DevTools ${port} dans le délai imparti.`,
    { cause: derniereErreur }
  );
}
