// vim: tabstop=8 softtabstop=0 noexpandtab shiftwidth=8 nosmarttab
// Copyright 2025 Digital Signage Bunny Corp. Use of this source code is
// governed by an MIT-style license that can be found in the LICENSE file or at
// https://opensource.org/licenses/MIT.

const express = require('express');
const ws = require('ws');

const app = express();

// This directory contains the compiled JavaScript files.
app.use('/dist', express.static('../dist'));

// This directory contains the node modules.
app.use('/node_modules', express.static('node_modules'));

if(process.env.NODE_ENV === "development") {
	// This directory contains the source files.
	app.use('/src', express.static('../src'));
}

// This directory contains the static files for the demo.
app.use(express.static('public'));

const wss = new ws.Server({ noServer: true });

class Group {
	#group_id;
	#members = new Map();
	constructor(group_id) {
		this.#group_id = group_id;
	}
	add(membership) {
		this.#members.set(membership.id, membership);
	}
	get(id) { return this.#members.get(id); }
	close(id) { this.#members.delete(id); }
}

class Membership {
	#id;
	#ws;
	#address;
	constructor(id, ws, address) {
		this.#id = id;
		this.#ws = ws;
		this.#address = address;
	}
	get id() { return this.#id; }
	get address() { return this.#address; }
	send(data) { this.#ws.send(data, { binary: false }); }
}

const groups = new Map();

wss.on("connection", (ws, req) => {
	const address = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
	console.log(`onconnection(${address})`);
	const url = new URL(req.url, 'http://localhost');
	const group_id = url.searchParams.get("group");
	const id = url.searchParams.get("id");
	console.log(`group: ${group_id}, id: ${id}`);
	const membership = new Membership(id, ws, address);
	let group = groups.get(group_id);
	if(typeof group === "undefined") {
		group = new Group(group_id);
		groups.set(group_id, group);
	}
	group.add(membership);
	ws.on("message", data => {
		const json = { ...JSON.parse(data.toString('utf8')), id };
		const text = JSON.stringify(json);
		console.log(`${address}: ${text}`);
		if('target' in json) {
			const target = group.get(json.target);
			if(target instanceof Membership) {
				console.log(`=> ${target.id}`);
				target.send(text);
			}
		}
	});
	ws.on("close", () => {
		if(typeof id === "undefined") {
			return;
		}
		group.close(id);
	});
});

const server = app.listen(3000, () => {
	console.log(`Listening on port ${server.address().port}`);
});

server.on('upgrade', (req, socket, head) => {
	console.log("onupgrade");
	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit('connection', ws, req);
	});
});
