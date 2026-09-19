self.addEventListener("install", (event) => {
  console.log("Service Worker installed.");
});
self.addEventListener("fetch", (event) => {
  // Let the browser do its default thing
  // for non-cached requests.
});