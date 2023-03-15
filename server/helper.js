const crypto = require("crypto");
const webPush = require("web-push");

const sendEmail = require("./email");
const config = require("./config");
const { Connections, Users } = require("./db").getInstance();

/**
 * Pure Functions
 */
const getValidHandle = (handle) => {
	if (!handle) return httpError(400, "Invalid username/handle");
	if (config.INVALID_HANDLES.includes(handle.toLowerCase())) return httpError(400, "Invalid username/handle");
	const handleRegex = /^([a-zA-Z0-9_]){1,15}$/;
	if (!handleRegex.test(handle)) return httpError(400, "Username is too long. Max. 15 chars.");
	return handle.toLowerCase();
};
const getValidEmail = (email) => {
	if (!email) return httpError(400, "Empty email");
	if (!validateEmail(email)) return httpError(400, "Invalid email");
	return email;
};
const validateEmail = (email) => {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
const getValidPassword = (password) => {
	if (!password) return httpError(400, "Invalid password");
	if (password.length < 8) return httpError(400, "Password length should be atleast 8 characters");
	return hashString(password);
};
const getValidColor = (color) => {
	const isValidColor = /^#[0-9A-F]{6}$/i.test(color);
	if (!isValidColor) return httpError(400, "Invalid color code");
	return color;
};
const randomString = () => "_" + Math.random().toString(36).substr(2, 9);

/*Authentication related functions*/
const getTokenFromSession = (req) => req.session.token;

const tokenAuthentication = async (req, res, next) => {
	if (req.user) return next();

	const token = getTokenFromSession(req);
	if (!token && !req.user) return res.status(401).json({ message: "Invalid request" });

	req["token"] = token;
	try {
		req["user"] = await Users.findOne({ "devices.token": token });
		!req["user"] ? res.status(401).json({ message: "Invalid request" }) : next();
	} catch (err) {
		res.status(500).json({ message: "Something went wrong" });
		console.error(err);
	}
};

const getApiKeyFromHeader = (headers) => {
	return headers["x-api-key"] ?? headers["X-API-KEY"];
};

const apiKeyAuthentication = async (req, res, next) => {
	const apiKey = getApiKeyFromHeader(req.headers);
	if (apiKey) {
		req["user"] = await Users.findOne({ apiKeys: apiKey });
		!req["user"] ? res.status(401).json({ message: "Invalid API key" }) : next();
	} else {
		next();
	}
};

/* DB validations */
const isNewHandle = async (handle, currentUserId) => {
	let query = { handle: { $regex: new RegExp(`^${handle}$`, "i") } };
	if (currentUserId) {
		query["_id"] = { $ne: currentUserId };
	}

	const existingHandle = await Users.findOne(query).select("handle").exec();
	return existingHandle ? httpError(400, "Username already taken") : handle;
};

const isNewEmail = async (email, currentUserId) => {
	let query = { email };
	if (currentUserId) {
		query["_id"] = { $ne: currentUserId };
	}

	const existingEmail = await Users.findOne(query).select("email").exec();
	return existingEmail ? httpError(400, "Email already taken") : email;
};

/*DB utilities*/
const sendHoy = async (user, toUsers = [], text) => {
	// Send push notifications
	toUsers.forEach((u) => {
		u.devices.forEach((d) => {
			if (d.pushCredentials) {
				const body = text.slice(0, 65) ?? "";
				let link = new URL(config.URL);
				if (text) {
					try {
						link = new URL(text);
					} catch (err) {} // if error just proceed
				}

				const payload = JSON.stringify({ from: user.handle, body, link });
				webPush.sendNotification(d.pushCredentials, payload, config.PUSH_OPTIONS);
			}
		});
	});

	const toUserIds = toUsers.map((u) => u._id);
	const updateContacts = await Connections.updateMany(
		{
			$and: [{ users: user._id }, { users: { $in: toUserIds } }],
		},
		{ lastHoyedAt: new Date() }
	);

	return updateContacts;
};

// const addHistory = async (user, recipients, data) => {
// 	return await new History({
// 		user: user._id,
// 		recipients: recipients.map((r) => r._id),
// 		data,
// 		createdAt: new Date(),
// 	}).save();
// };

const inviteUser = async (user, email) => {
	const updateField = { $push: { invitees: email } };
	await Users.updateOne({ _id: user._id }, updateField);
	return await sendEmail.sendInviteEmail(user, email);
};

const hashString = (str) => {
	return crypto.createHash("sha256", config.SECRET).update(str).digest("hex");
};

//Throws a error which can be handled and changed to HTTP Error in the Express js Error handling middleware.
const httpError = (code, message) => {
	code = code ? code : 500;
	message = message ? message : "Something went wrong";
	const errorObject = new Error(message);
	errorObject.httpErrorCode = code;
	throw errorObject;
};

module.exports = {
	getValidHandle,
	getValidEmail,
	validateEmail,
	getValidPassword,
	getValidColor,
	randomString,
	isNewHandle,
	isNewEmail,
	hashString,
	httpError,
	tokenAuthentication,
	apiKeyAuthentication,
	sendHoy,
	inviteUser,
};
