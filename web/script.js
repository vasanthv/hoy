/* global  page, axios, Vue */

const { loadModule } = window["vue3-sfc-loader"];
let swReg = null;
const options = {
	moduleCache: {
		vue: Vue,
	},
	async getFile(url) {
		const res = await fetch(url);
		if (!res.ok) throw Object.assign(new Error(res.statusText + " " + url), { res });
		return {
			getContentData: (asBinary) => (asBinary ? res.arrayBuffer() : res.text()),
		};
	},
	addStyle(textContent) {
		const style = Object.assign(document.createElement("style"), { textContent });
		const ref = document.head.getElementsByTagName("style")[0] || null;
		document.head.insertBefore(style, ref);
	},
};

const urlB64ToUint8Array = (base64String) => {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

const defaultState = function () {
	return {
		online: true,
		visible: true,
		loading: false,
		page: "",
		newAccount: { handle: "", email: "", password: "" },
		authCreds: { handle: "", password: "" },
		toast: { type: "", message: "", time: new Date().getTime() },
		handle: window.localStorage.handle,
		homeContacts: [],
		selectedContacts: [],
		history: [],
		text: "",
		showLoadMore: false,
		me: { isNotificationEnabled: true },
		userIdentifier: "",
		addUserFieldFocused: false,
		account: {},
		hoyDetails: {},
		onboardMeta: {
			allowedNotification: !!window.localStorage.allowedNotification,
		},
	};
};

const App = Vue.createApp({
	components: {
		account: Vue.defineAsyncComponent(() => loadModule("./vues/account.vue", options)),
		contact: Vue.defineAsyncComponent(() => loadModule("./vues/contact.vue", options)),
		intro: Vue.defineAsyncComponent(() => loadModule("./vues/intro.vue", options)),
		legal: Vue.defineAsyncComponent(() => loadModule("./vues/legal.vue", options)),
		onboard: Vue.defineAsyncComponent(() => loadModule("./vues/onboard.vue", options)),
	},
	data() {
		return defaultState();
	},
	computed: {
		isLoggedIn() {
			return !!this.handle;
		},
		pageTitle() {
			switch (this.page) {
				case "register":
					return "Create an Account";
				case "login":
					return "Log In";
				case "home":
					return "Home";
				case "account":
					return "Account settings";
				case "hoy":
					return `From ${this.hoyDetails.from}`;
				default:
					return "";
			}
		},
		showBackButton() {
			return !["intro", "home"].includes(this.page);
		},
		showNotificationRequest() {
			return !this.me.isNotificationEnabled && this.isLoggedIn && ["home", "account"].includes(this.page);
		},
		addUserPlaceholder() {
			return this.addUserFieldFocused ? "enter an username or email" : "add/invite friend";
		},
		hoyDate() {
			const date = new Date(this.hoyDetails.time);
			const hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
			return (
				["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()] +
				" " +
				(date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) +
				" " +
				date.getFullYear() +
				" - " +
				(hours < 10 ? "0" + hours : hours) +
				":" +
				(date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()) +
				" " +
				(date.getHours() >= 12 ? "PM" : "AM")
			);
		},
		userOnboarded() {
			return Object.keys(this.onboardMeta).every((key) => this.onboardMeta[key] === true);
		},
	},
	methods: {
		setToast(message, type = "error") {
			this.toast = { type, message, time: new Date().getTime() };
			setTimeout(() => {
				if (new Date().getTime() - this.toast.time >= 3000) {
					this.toast.message = "";
				}
			}, 3500);
		},
		signup() {
			if (!this.newAccount.handle || !this.newAccount.email || !this.newAccount.password) {
				return this.setToast("All fields are mandatory");
			}
			axios.post("/api/register", this.newAccount).then(this.authenticate);
		},
		login() {
			if (!this.authCreds.handle || !this.authCreds.password) {
				return this.setToast("Please enter valid details");
			}
			axios.post("/api/login", this.authCreds).then(this.authenticate);
		},
		forgotPassword() {
			if (!this.authCreds.handle || !this.authCreds.password) {
				return this.setToast("Please enter your username or email");
			}
			axios.post("/api/reset", { handle: this.authCreds.handle }).then((response) => {
				this.setToast(response.data.message, "success");
			});
		},
		authenticate(response) {
			window.localStorage.handle = this.handle = response.data.handle;
			this.newAccount = { handle: "", email: "", password: "" };
			this.authCreds = { handle: "", password: "" };
			page.redirect("/");
			this.setToast(response.data.message, "success");
		},
		updateAccount(updatedMe) {
			axios.put("/api/profile", { ...updatedMe }).then((response) => {
				this.setToast(response.data.message, "success");
				window.localStorage.handle = this.handle = updatedMe.handle;
			});
		},
		getHomeContacts(loadMore) {
			const params = {};
			if (this.homeContacts.length > 0 && loadMore) {
				params["skip"] = this.homeContacts.length;
			}

			axios
				.get("/api/home", { params })
				.then((response) => {
					if (!loadMore) this.homeContacts = [];
					if (response.data.contacts.length > 0) {
						response.data.contacts.forEach((c) => this.homeContacts.push(c));
					}
					this.me = response.data.me;
				})
				.catch((err) => {
					if (err.response.status === 401) {
						this.logout(true);
					}
				})
				.finally(() => {
					this.loading = false;
					this.fetchingStatuses = false;
				});
		},
		addContact(userIdentifier) {
			axios.post("/api/contact/add", { userIdentifier }).then((response) => {
				this.setToast(response.data.message, "success");
				this.userIdentifier = "";
				this.getHomeContacts();
			});
		},
		removeContact(handle) {
			axios.post("/api/contact/remove", { handle }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getHomeContacts();
			});
		},
		blockContact(handle) {
			axios.post("/api/contact/block", { handle }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getHomeContacts();
			});
		},
		unblockContact(handle) {
			axios.post("/api/contact/unblock", { handle }).then((response) => {
				this.setToast(response.data.message, "success");
				this.getMe();
			});
		},
		sendHoy(handles) {
			axios.post("/api/hoy", { handles, text: this.text }).then((response) => {
				this.setToast(response.data.message, "success");
				this.selectedContacts = [];
				this.text = "";
				this.getHomeContacts();
			});
		},
		getMe() {
			axios.get("/api/me").then((response) => {
				this.account = response.data;
			});
		},
		deleteBrowser(id) {
			axios.delete("/api/browser/" + id).then((response) => {
				this.setToast(response.data.message, "success");
				this.getMe();
			});
		},
		notificationRequestClickHandler() {
			if (this.isLoggedIn) subscribeToPush();
		},
		toggleSelectContact(handle) {
			if (this.selectedContacts.length >= 100) {
				this.setToast("Contacts limit reached", "error");
			}
			const index = this.selectedContacts.indexOf(handle);
			if (index >= 0) {
				this.selectedContacts.splice(index, 1);
			} else {
				this.selectedContacts.push(handle);
			}
		},
		removeSelectedContacts() {
			this.selectedContacts = [];
		},
		onTextChange(text) {
			this.text = text;
		},
		logout(autoLogout) {
			const localClear = () => {
				window.localStorage.clear();
				const newState = defaultState();
				Object.keys(newState).map((key) => (this[key] = newState[key]));
				page.redirect("/");
			};
			if (autoLogout || confirm("Are you sure, you want to log out?")) axios.delete("/api/logout").finally(localClear);
		},
	},
}).mount("#app");

const subscribeToPush = async () => {
	if (swReg) {
		try {
			const vapidKey = (await axios.get("/api/meta")).data.vapidKey;
			const pushSubscription = await swReg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlB64ToUint8Array(vapidKey),
			});
			const credentials = JSON.parse(JSON.stringify(pushSubscription));
			await axios.put("/api/browser", { credentials });
			App.onboardMeta.allowedNotification = true;
			window.localStorage.allowedNotification = true;
			App.getHomeContacts();
		} catch (err) {
			App.setToast(err.message, "error");
		}
	}
};

const initServiceWorker = async () => {
	if ("serviceWorker" in navigator) {
		swReg = await navigator.serviceWorker.register("/sw.js");
	}
};

const initRoutes = () => {
	page("/", () => {
		if (App.isLoggedIn) {
			App.page = "home";
			App.getHomeContacts();
			if (App.onboardMeta.allowedNotification) subscribeToPush();
		} else {
			App.page = "intro";
		}
	});

	page("/register", () => {
		if (App.isLoggedIn) {
			page.redirect("/");
		} else {
			App.page = "register";
		}
	});

	page("/login", () => {
		if (App.isLoggedIn) {
			page.redirect("/");
		} else {
			App.page = "login";
		}
	});

	page("/account", () => {
		if (App.isLoggedIn) {
			App.page = "account";
			App.getMe();
		} else {
			page.redirect("/login");
		}
	});

	page("/terms", () => (App.page = "legal"));
	page("/privacy", () => (App.page = "legal"));

	page();
};

axios.interceptors.response.use(
	(response) => response,
	(error) => {
		App.setToast(error.response.data.message || "Something went wrong. Please try again");
		throw error;
	}
);

const init = async () => {
	await initServiceWorker();
	initRoutes();
};

init();
