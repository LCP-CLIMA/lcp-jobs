self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("lcp-jobs-v9") === -1 && key.indexOf("lcp-ocr") === -1;
      }).map(function (key) { return caches.delete(key); }));
    }).then(function () {
      return self.clients.matchAll({ type: "window", includeUncontrolled: true });
    }).then(function (clients) {
      clients.forEach(function (client) {
        if (client.url && "navigate" in client) client.navigate(client.url);
      });
    }),
  );
});
