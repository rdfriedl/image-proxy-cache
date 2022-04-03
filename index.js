#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const crypto = require("crypto");
const express = require("express");

const cachePathEnv = process.env.CACHE_DIR || "./cache";
const cacheDir = path.isAbsolute(cachePathEnv)
	? cachePathEnv
	: path.join(process.cwd(), cachePathEnv);

const app = express();

app.get("/", async (req, res) => {
	if (!req.query.url) {
		throw new Error("missing url param");
	}

	const imageUrl = req.query.url;
	const hash = crypto.createHash("md5").update(imageUrl).digest("hex");
	const metadataPath = path.join(cacheDir, hash + ".json");
	const cachePath = path.join(cacheDir, hash);

	try {
		const metadata = fs.existsSync(metadataPath)
			? JSON.parse(fs.readFileSync(metadataPath, { encoding: "utf-8" }))
			: null;

		if (metadata && fs.existsSync(cachePath)) {
			Object.keys(metadata.headers).forEach((name) => {
				res.setHeader(name, metadata.headers[name]);
			});

			res.sendFile(cachePath);
			return;
		}
	} catch (err) {
		res.send("failed to read cache");
		try {
			console.log(`removing cache files for ${hash}`);
			fs.rmSync(metadataPath);
			fs.rmSync(cachePath);
		} catch (e) {}
		return;
	}

	console.log(`Fetching ${imageUrl}`);
	const imageRes = await axios.get(imageUrl, {
		responseType: "arraybuffer",
		headers: {
			"user-agent":
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Safari/537.36",
		},
	});

	if (!imageRes.headers["content-type"].includes("image")) {
		throw new Error("the url must point to an image");
	}

	const headers = {
		"content-type": imageRes.headers["content-type"],
		"content-length": imageRes.headers["content-length"],
	};
	const metadata = { headers };

	console.log(`Writing cache ${cachePath}`);
	fs.writeFileSync(cachePath, imageRes.data);
	fs.writeFileSync(metadataPath, JSON.stringify(metadata), {
		encoding: "utf-8",
	});

	Object.keys(headers).forEach((name) => {
		res.setHeader(name, headers[name]);
	});
	res.sendFile(cachePath);
});

app.listen(3000);
console.log("started server on 3000");

process.on('SIGINT', () => {
	process.exit();
})
