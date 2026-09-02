const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

let latestData = {
  top: "",
  bottom: ""
};

// Ma'am ka submit
app.post("/submit", (req, res) => {
  const { top, bottom } = req.body;

  latestData = {
    top: String(top || ""),
    bottom: String(bottom || "")
  };

  // Tumhare dashboard ko live data bhejo
  io.emit("newData", latestData);

  res.json({
    success: true
  });
});

// Dashboard open hone par latest data bhejo
io.on("connection", (socket) => {
  socket.emit("newData", latestData);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
