const uuid = require("uuid").v4;
const randomString = require("randomstring");
const { generateApiKey } = require("generate-api-key");
const flatuicolor = require("flat-color-generator");
const uaParser = require("ua-parser-js");

const helper = require("./helper");
const sendEmail = require("./email");

const { Users, Connections } = require("./db").getInstance();

const register = async (req, res, next) => {
	try {
		const handle = await helper.getValidHandle(req.body.handle);
		await helper.isNewHandle(handle);
		const email = await helper.getValidEmail(req.body.email);
		await helper.isNewEmail(email);
		const password = await helper.getValidPassword(req.body.password);
		const userAgent = req.get("user-agent");
		const color = flatuicolor().hex;
		const date = new Date();

		const emailVerificationCode = uuid();
		const token = uuid();

		const newUser = await new Users({
			handle,
			email,
			password,
			color,
			emailVerificationCode,
			devices: [{ token, userAgent }],
			createdAt: date,
		}).save();
		await sendEmail.verificationEmail(handle, email, emailVerificationCode);
		req.session.token = token;

		res.json({ message: "Account created", handle });

		try {
			const invitedUsers = await Users.find({ invitees: email });
			if (invitedUsers && invitedUsers.length > 0) {
				const invitedUserHandlingPromises = invitedUsers.map(async (u) => {
					return new Connections({
						users: [u._id, newUser._id],
						createdAt: date,
						createdBy: u._id,
						lastHoyedAt: date,
					}).save();
				});

				await Promise.all([
					invitedUserHandlingPromises,
					Users.updateMany({ invitees: email }, { $pull: { invitees: email } }),
				]);
			}
		} catch (err) {}
	} catch (error) {
		next(error);
	}
};

const login = async (req, res, next) => {
	try {
		const handle = req.body.handle;
		const password = await helper.getValidPassword(req.body.password);
		const userAgent = req.get("user-agent");

		const query = { handle, password };
		const user = await Users.findOne(query).exec();
		if (!user) helper.httpError(400, "Invalid user credentials");

		const token = uuid();
		const devices = { token, userAgent };

		await Users.updateOne({ _id: user._id }, { $push: { devices }, lastLoginAt: new Date() });

		req.session.token = token;
		res.json({ message: "Logged in", handle: user.handle });
	} catch (error) {
		next(error);
	}
};

const verifyEmail = async (req, res, next) => {
	try {
		const code = req.params.code;

		const user = await Users.findOne({ emailVerificationCode: code }).exec();
		if (!user) return res.status(400).send("Invalid email verification code");

		await Users.updateOne({ _id: user._id }, { $unset: { emailVerificationCode: 1 }, lastUpdatedAt: new Date() });

		res.send("Email verified");
	} catch (error) {
		next(error);
	}
};

const resetPassword = async (req, res, next) => {
	try {
		const handle = req.body.handle;

		const user = await Users.findOne({ handle }).exec();
		if (!user) return helper.httpError(400, "Invalid handle");

		const passwordString = randomString.generate(8);
		const password = await helper.getValidPassword(passwordString);

		await Users.updateOne({ _id: user._id }, { password, lastUpdatedAt: new Date() });
		await sendEmail.resetPasswordEmail(user.handle, user.email, passwordString);

		res.json({ message: "Password resetted" });
	} catch (error) {
		next(error);
	}
};

const updateProfile = async (req, res, next) => {
	try {
		const handle =
			req.body.handle && req.body.handle !== req.user.handle ? await helper.getValidHandle(req.body.handle) : null;
		if (handle) await helper.isNewHandle(handle, req.user._id);

		const email =
			req.body.email && req.body.email !== req.user.email ? await helper.getValidEmail(req.body.email) : null;
		if (email) await helper.isNewEmail(email, req.user._id);

		const name = req.body.name ? (req.body.name || "").substr(0, 50) : null;
		const password = req.body.password ? await helper.getValidPassword(req.body.password) : null;
		const color = req.body.color ? await helper.getValidColor(req.body.color) : null;

		const updateFields = {};
		if (handle) updateFields["handle"] = handle;
		if (name) updateFields["name"] = name;
		if (password) updateFields["password"] = password;
		if (color) updateFields["color"] = color;

		if (email && email !== req.user.email) {
			const emailVerificationCode = uuid();
			updateFields["email"] = email;
			updateFields["emailVerificationCode"] = emailVerificationCode;
			await sendEmail.verificationEmail(req.user.handle, email, emailVerificationCode);
		}

		await Users.updateOne({ _id: req.user._id }, { ...updateFields, lastUpdatedDate: new Date() });
		res.json({
			message: `Account updated. ${updateFields["emailVerificationCode"] ? "Please verify your email" : ""}`,
		});
	} catch (error) {
		next(error);
	}
};

const updatePushCredentials = async (req, res, next) => {
	try {
		const credentials = req.body.credentials;

		await Users.findOneAndUpdate(
			{ _id: req.user._id, "devices.token": req.token },
			{
				$set: {
					"devices.$.pushCredentials": credentials,
				},
			}
		);
		res.json({ message: "Push credentials updated" });
	} catch (error) {
		next(error);
	}
};

const newApiKey = async (req, res, next) => {
	try {
		const apiKey = generateApiKey({ method: "uuidv4", dashes: false });

		await Users.updateOne({ _id: req.user._id }, { $push: { apiKeys: apiKey }, lastUpdatedDate: new Date() });

		res.json({ message: "API Key updated" });
	} catch (error) {
		next(error);
	}
};

const deleteApiKey = async (req, res, next) => {
	try {
		const apiKey = req.query.key;

		await Users.updateOne({ _id: req.user._id }, { $pull: { apiKeys: apiKey }, lastUpdatedDate: new Date() });

		res.json({ message: "API Key deleted" });
	} catch (error) {
		next(error);
	}
};

const getMe = async (req, res, next) => {
	try {
		const [user, blockedConnections] = await Promise.all([
			Users.findOne({ _id: req.user._id }).exec(),
			Connections.find({ users: req.user._id, blockedBy: req.user._id })
				.populate([{ path: "users", select: "handle color" }])
				.select("users")
				.exec(),
		]);

		const blocked = blockedConnections.map((connection) => {
			const blockedUser = connection.users.find((u) => u.handle !== req.user.handle);
			return blockedUser;
		});

		const { name, handle, email, color, devices } = user;
		res.json({
			name,
			handle,
			email,
			color,
			blocked,
			devices: devices.map((d) => ({
				id: d._id,
				userAgent: d.userAgent,
				meta: uaParser(d.userAgent),
				isCurrent: d.token === req.token,
			})),
		});
	} catch (error) {
		next(error);
	}
};

const sendHoy = async (req, res, next) => {
	try {
		if (req.user.emailVerificationCode) {
			return res.status(400).json({ message: "Please verify your email." });
		}

		let recipientUsers = [];
		const handles = (req.body.handles ?? []).slice(0, 100);
		recipientUsers = await Users.find({ handle: { $in: handles } })
			.select("handle devices")
			.exec();

		const allowedRecipients = await helper.getAllowedRecipients(req.user, recipientUsers);
		const allowedRecipientHandles = allowedRecipients.map((r) => r.handle);

		recipientUsers = recipientUsers.filter(
			(u) => allowedRecipientHandles.includes(u.handle) || u.handle === req.user.handle
		);

		if (recipientUsers.length === 0) {
			return res.status(400).json({ message: "Invalid recipients" });
		}

		res.json({
			message: `Hoy sent ${recipientUsers.length > 1 ? `to ${recipientUsers.length} recipients` : ""}`,
			recipientCount: recipientUsers.length,
		});

		const text = req.body.text;
		await Promise.all([
			helper.sendHoy(req.user, recipientUsers, text),
			Users.updateOne({ _id: req.user._id }, { $inc: { hoyCount: 1 } }),
		]);
	} catch (error) {
		next(error);
	}
};

const getHomeContacts = async (req, res, next) => {
	try {
		const skip = Number(req.query.skip) || 0;

		const rawContacts = await Connections.find({ users: req.user._id, blockedBy: { $ne: req.user._id } })
			.populate([{ path: "users", select: "handle name color" }])
			.select("users lastHoyedAt")
			.skip(skip)
			.limit(100)
			.sort("-lastHoyedAt")
			.exec();

		const contacts = rawContacts.map((c) => {
			const contact = c.users.find((u) => u.handle !== req.user.handle);
			return {
				_id: contact._id,
				handle: contact.handle,
				color: contact.color,
				lastHoyedAt: c.lastHoyedAt,
			};
		});

		res.json({
			contacts,
			me: {
				handle: req.user.handle,
				color: req.user.color,
				isNotificationEnabled: !!req.user.devices.find((d) => d.token === req.token).pushCredentials,
				browsersConfigured: req.user.devices.filter((d) => !!d.pushCredentials).length,
			},
		});
	} catch (error) {
		next(error);
	}
};

const addContact = async (req, res, next) => {
	try {
		const userIdentifier = (req.body.userIdentifier ?? "").toLowerCase();
		if (!userIdentifier) {
			return res.status(400).json({ message: "Empty username" });
		}
		const isEmail = helper.validateEmail(userIdentifier);

		let contactUser = null;
		if (userIdentifier && isEmail) {
			// Handle typed email
			const emailUser = await Users.findOne({ email: userIdentifier }).select("handle").exec();

			if (!emailUser) {
				await helper.inviteUser(req.user, userIdentifier);
				return res.json({ message: "User invited" });
			}
			contactUser = emailUser;
		} else if (userIdentifier && !isEmail) {
			const userFromHandle = await Users.findOne({ handle: userIdentifier }).select("handle").exec();
			if (!userFromHandle) {
				return res.status(400).json({ message: "Invalid username" });
			}
			contactUser = userFromHandle;
		}
		if (contactUser._id.equals(req.user._id)) {
			return res.status(400).json({ message: "That's you!" });
		}

		await new Connections({
			users: [req.user._id, contactUser._id],
			createdAt: new Date(),
			lastHoyedAt: new Date(),
			createdBy: req.user._id,
		}).save();

		res.json({ message: "Contact added" });
	} catch (error) {
		next(error);
	}
};

const removeContact = async (req, res, next) => {
	try {
		const handle = req.body.handle;
		const contactUser = await Users.findOne({ handle }).select("handle").exec();
		if (!contactUser) {
			return res.status(400).json({ message: "Invalid username" });
		}
		await Connections.deleteOne({ $and: [{ users: req.user._id }, { users: contactUser._id }] });

		res.json({ message: "Contact removed" });
	} catch (error) {
		next(error);
	}
};

const blockUser = async (req, res, next) => {
	try {
		const handle = req.body.handle.toLowerCase();

		if (handle === req.user.handle) return helper.httpError(400, "That's you");
		const userToBeBlocked = await Users.findOne({ handle });
		let responseMessage = "";
		if (!userToBeBlocked) {
			return helper.httpError(400, "Invalid user");
		}

		const updateField = { $push: { blockedBy: req.user._id } };
		await Connections.updateOne({ $and: [{ users: req.user._id }, { users: userToBeBlocked._id }] }, updateField);
		responseMessage = "User blocked";

		res.json({ message: responseMessage });
	} catch (error) {
		next(error);
	}
};

const unblockUser = async (req, res, next) => {
	try {
		const handle = req.body.handle.toLowerCase();
		let responseMessage = "User is not blocked";

		if (handle === req.user.handle) return helper.httpError(400, "That's you");
		const userToBeUnblocked = await Users.findOne({ handle });
		if (!userToBeUnblocked) return helper.httpError(400, "Invalid user");

		const updateField = { $pull: { blockedBy: req.user._id } };
		await Connections.updateOne({ $and: [{ users: req.user._id }, { users: userToBeUnblocked._id }] }, updateField);
		responseMessage = "User unblocked";

		res.json({ message: responseMessage });
	} catch (error) {
		next(error);
	}
};

const deletePushCredentials = async (req, res, next) => {
	try {
		const id = req.params.id;
		await Users.updateOne({ _id: req.user._id }, { $pull: { devices: { _id: id } } });
		res.json({ message: "Logged out from the browser" });
	} catch (error) {
		next(error);
	}
};

const logout = async (req, res, next) => {
	try {
		await Users.updateOne({ _id: req.user._id }, { $pull: { devices: { token: req.token } } });
		req.session.destroy();
		res.json({ message: "Logged out" });
	} catch (error) {
		next(error);
	}
};

const getAllUsers = async (req, res, next) => {
	try {
		const response = await Users.find({}).exec();
		res.status(200).send(response);
	} catch (error) {
		next(error);
	}
};

const getStats = async (req, res, next) => {
	try {
		const response = await Promise.all([
			Users.aggregate([{ $group: { _id: null, count: { $sum: "$hoyCount" } } }]),
			Users.estimatedDocumentCount(),
		]);
		res.status(200).send({ usersCount: response[1], hoyCount: response[0][0].count });
	} catch (error) {
		next(error);
	}
};

module.exports = {
	register,
	login,
	verifyEmail,
	resetPassword,
	updateProfile,
	updatePushCredentials,
	newApiKey,
	deleteApiKey,
	getMe,
	sendHoy,
	getHomeContacts,
	addContact,
	removeContact,
	blockUser,
	unblockUser,
	deletePushCredentials,
	logout,
	getStats,
	getAllUsers,
};
