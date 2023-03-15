/**
 * A singleton implemetaion for the database
 */

const mongoose = require("mongoose");
const config = require("./config");

module.exports = (() => {
	let instance;
	let db = mongoose.connection;
	mongoose.set("strictQuery", true);

	const connectToDb = () => {
		mongoose.connect(config.MONGO_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
	};

	const createInstance = () => {
		db.on("error", (error) => {
			console.error("Error in MongoDb connection: " + error);
			mongoose.disconnect(); // Trigger disconnect on any error
		});
		db.on("connected", () => console.log("Hoy DB connected"));
		db.on("disconnected", () => {
			console.log("MongoDB disconnected!");
			connectToDb();
		});

		connectToDb();
		const Schema = mongoose.Schema;

		console.log("Hoy DB initialized");

		const userSchema = new Schema({
			handle: { type: String, index: true, required: true, unique: true, match: /^([a-zA-Z0-9_]){1,18}$/ },
			name: { type: String, text: true },
			email: { type: String, index: true, unique: true, required: true },
			password: { type: String, required: true },
			color: String,
			emailVerificationCode: { type: String, index: true },
			createdAt: { type: Date, default: Date.now },
			lastLoginAt: Date,
			updatedAt: Date,
			devices: [
				// devices are actually browsers
				{
					token: { type: String, index: true }, // authentication token
					notificationToken: { type: String }, // deprecated: FCM token
					pushCredentials: Object, //  Push subscription data which includes push endpoint, token & auth credentials
					userAgent: { type: String },
				},
			],
			invitees: [{ type: String, index: true }],
			apiKeys: [{ type: String, index: true }],
			hoyCount: { type: Number, default: 0 },
		});

		const connectionsSchema = new Schema({
			users: [{ type: Schema.Types.ObjectId, ref: "Users", index: true }],
			createdAt: { type: Date, default: Date.now },
			createdBy: { type: Schema.Types.ObjectId, ref: "Users", index: true },
			lastHoyedAt: { type: Date, default: Date.now },
			blockedBy: [{ type: Schema.Types.ObjectId, ref: "Users", index: true }],
		});

		const Users = mongoose.model("Users", userSchema);
		const Connections = mongoose.model("Connections", connectionsSchema);

		// Users.syncIndexes()
		// 	.then(() => Users.ensureIndexes())
		// 	.then(() => Users.collection.getIndexes())
		// 	.then(console.log);

		return { Users, Connections };
	};
	return {
		getInstance: () => {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		},
	};
})();
