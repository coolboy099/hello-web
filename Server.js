const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

const SERVERS_DIR = path.join(__dirname, "servers");

if (!fs.existsSync(SERVERS_DIR)) {
    fs.mkdirSync(SERVERS_DIR);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const runningServers = {};

function serverPath(name) {
    return path.join(SERVERS_DIR, name);
}

// Create server
app.post("/api/create", (req, res) => {
    const name = String(req.body.name || "").trim();

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return res.status(400).json({
            error: "Invalid server name"
        });
    }

    const dir = serverPath(name);

    if (fs.existsSync(dir)) {
        return res.status(400).json({
            error: "Server already exists"
        });
    }

    fs.mkdirSync(dir, { recursive: true });

    res.json({
        success: true,
        message: `Server "${name}" created`
    });
});

// List servers
app.get("/api/servers", (req, res) => {
    const servers = fs.readdirSync(SERVERS_DIR)
        .filter(file => fs.statSync(serverPath(file)).isDirectory())
        .map(name => ({
            name,
            running: !!runningServers[name]
        }));

    res.json(servers);
});

// Start server
app.post("/api/start/:name", (req, res) => {
    const name = req.params.name;
    const dir = serverPath(name);

    if (!fs.existsSync(dir)) {
        return res.status(404).json({
            error: "Server not found"
        });
    }

    if (runningServers[name]) {
        return res.status(400).json({
            error: "Server already running"
        });
    }

    /*
      IMPORTANT:
      Put paper.jar inside:
      servers/<server-name>/paper.jar
    */

    const jar = path.join(dir, "paper.jar");

    if (!fs.existsSync(jar)) {
        return res.status(400).json({
            error: "paper.jar not found"
        });
    }

    const process = spawn(
        "java",
        [
            "-Xms512M",
            "-Xmx1G",
            "-jar",
            "paper.jar",
            "nogui"
        ],
        {
            cwd: dir
        }
    );

    runningServers[name] = {
        process,
        logs: []
    };

    process.stdout.on("data", data => {
        const text = data.toString();

        runningServers[name].logs.push(text);

        if (runningServers[name].logs.length > 200) {
            runningServers[name].logs.shift();
        }

        console.log(`[${name}] ${text}`);
    });

    process.stderr.on("data", data => {
        const text = data.toString();

        runningServers[name].logs.push(text);

        console.error(`[${name}] ${text}`);
    });

    process.on("close", code => {
        console.log(`${name} stopped with code ${code}`);
        delete runningServers[name];
    });

    res.json({
        success: true,
        message: `${name} started`
    });
});

// Stop server
app.post("/api/stop/:name", (req, res) => {
    const name = req.params.name;

    const server = runningServers[name];

    if (!server) {
        return res.status(400).json({
            error: "Server is not running"
        });
    }

    server.process.stdin.write("stop\n");

    res.json({
        success: true,
        message: `${name} stopping`
    });
});

// Console logs
app.get("/api/logs/:name", (req, res) => {
    const name = req.params.name;

    if (!runningServers[name]) {
        return res.json({
            logs: []
        });
    }

    res.json({
        logs: runningServers[name].logs
    });
});

app.listen(PORT, () => {
    console.log(`Mini-Aternos running at http://localhost:${PORT}`);
});
