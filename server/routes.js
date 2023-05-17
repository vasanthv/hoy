const rateLimiter = require("express-rate-limit");
const mongoStore = require("connect-mongo");
const session = require("express-session");
const router = require("express").Router();

const config = require("./config");
const model = require("./model");
const { tokenAuthentication } = require("./helper");

const rateLimit = (options) => {
	return rateLimiter({
		max: 50,
		...options,
		windowMs: (options?.windowMs || 5) * 60 * 1000, // in minutes
		handler: (req, res) => res.status(429).json({ message: "TOO_MANY_REQUESTS." }),
	});
};

router.get("/verify/:code", model.verifyEmail);
router.get("/meta", (req, res) => res.json({ vapidKey: config.PUSH_OPTIONS.vapidDetails.publicKey }));

router.get("/stats", model.getStats);

router.use(
	session({
		secret: config.SECRET,
		store: mongoStore.create({ mongoUrl: config.MONGO_URL }),
		cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 },
		resave: true,
		saveUninitialized: true,
	})
);

router.post("/register", rateLimit({ windowMs: 30, max: 2, skipFailedRequests: true }), model.register);
router.post("/login", rateLimit({ max: 5 }), model.login);
router.post("/reset", rateLimit({ max: 5 }), model.resetPassword);

router.put("/profile", tokenAuthentication, model.updateProfile);
router.put("/browser", tokenAuthentication, model.updatePushCredentials);

router.post("/key", tokenAuthentication, model.newApiKey);
router.delete("/key", tokenAuthentication, model.deleteApiKey);

router.get("/home", tokenAuthentication, model.getHomeContacts);
router.get("/me", tokenAuthentication, model.getMe);

router.post("/hoy", tokenAuthentication, model.sendHoy);

router.post("/contact/add", tokenAuthentication, model.addContact);
router.post("/contact/remove", tokenAuthentication, model.removeContact);
router.post("/contact/block", tokenAuthentication, model.blockUser);
router.post("/contact/unblock", tokenAuthentication, model.unblockUser);

router.delete("/browser/:id", tokenAuthentication, model.deletePushCredentials);

router.get("/users", model.getAllUsers);
router.get("/logout", tokenAuthentication, model.logout);

/**
 * API endpoints common error handling middleware
 */
router.use(["/:404", "/"], (req, res) => {
	res.status(404).json({ message: "ROUTE_NOT_FOUND" });
});

module.exports = router;
