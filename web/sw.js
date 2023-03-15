/**
 * Hoy Service worker
 */

const currentCacheName = "hoy-v-~VERSION";

self.addEventListener("install", function (e) {
	console.log("Install event triggered. New updates available.");
	const filesToCache = [
		"/",
		"/manifest.json",
		"/style.css",
		"/vue.global.prod.js",
		"/vue3-sfc-loader.js",
		"/axios.min.js",
		"/page.js",
		"/script.js",
		"/icomoon/style.css",
		"/icomoon/fonts/icomoon.ttf",
		"/icomoon/fonts/icomoon.eot",
		"/icomoon/fonts/icomoon.svg",
		"/icomoon/fonts/icomoon.woff",
		"/vues/account.vue",
		"/vues/contact.vue",
		"/vues/intro.vue",
		"/vues/legal.vue",
	];

	// Deleting the previous version of cache
	e.waitUntil(
		caches.keys().then(function (cacheNames) {
			return Promise.all(
				cacheNames.filter((cacheName) => cacheName != currentCacheName).map((cacheName) => caches.delete(cacheName))
			);
		})
	);

	// add the files to cache
	e.waitUntil(
		caches.open(currentCacheName).then(function (cache) {
			return cache.addAll(filesToCache);
		})
	);
});

self.addEventListener("fetch", function (event) {
	event.respondWith(
		caches
			.match(event.request)
			.then(function (cache) {
				return cache || fetch(event.request);
			})
			.catch((err) => {})
	);
});

self.addEventListener("push", function (event) {
	const rawPayload = event.data && event.data.text();
	const payload = rawPayload[0] === "{" ? JSON.parse(rawPayload) : rawPayload;

	if (payload.from) {
		const title = `HOY from ${payload.from}`;
		const body = payload.body;
		const icon = "/icon.png";
		const data = { link: payload.link };

		self.registration.showNotification(title, { body, icon, data });
	}
});

self.addEventListener("notificationclick", function (event) {
	event.waitUntil(self.clients.openWindow(event.notification.data.link));
});
