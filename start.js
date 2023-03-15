const bodyParser = require("body-parser");
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const app = express();

const config = { PORT: process.env.PORT || 80 };

app.set("trust proxy", true);

// Libraries used by frontend
app.use(express.static(path.join(__dirname, "node_modules/vue/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/vue3-sfc-loader/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/axios/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/page/")));

// Serve frontend pages
app.use(express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "icons")));
app.use(express.static(path.join(__dirname, "web"), { maxAge: 0 }));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "web/index.html")));

// Handle API requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev")); // for dev logging

// API routing
const routes = require("./server/routes");
app.use("/api", routes);

app.get(["/", "/account", "/login", "/register", "/terms", "/legal", "privacy"], (req, res) =>
	res.sendFile(path.join(__dirname, "web/index.html"))
);

// Handle the known errors
app.use((err, req, res, next) => {
	if (err.httpErrorCode) {
		res.status(err.httpErrorCode).json({ message: err.message || "Something went wrong" });
	} else {
		next(err);
	}
});

// Handle the unknown errors
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ message: err.message || "Something went wrong" });
});

// Start the server
app.listen(config.PORT, null, function () {
	console.log("Node version", process.version);
	console.log("Hoy server running on port", config.PORT);
});
