const express = require("express");
const bodyParser = require("body-parser");
const { sendTweet } = require("./agent/schedule");
const MonitorHandler = require("./monitor/monitorHandler");
const generateReplyTweet = require("./agent/reply");
const {
  startHealthCheckTimer,
  receiveHealthCheck,
} = require("./monitor/health");

const app = express();
const PORT = process.env.PORT || 38000;

// Parse incoming JSON payloads
app.use(bodyParser.json());

// Initialize the monitor handler
const monitorHandler = new MonitorHandler();

// Start monitoring Bluesky for mentions and interactions
monitorHandler.startMonitoring(2 * 60 * 1000);

sendTweet();

// Webhook endpoint for generating reply tweets
app.post("/hook", async (req, res) => {
  console.log("Received webhook call:", req.body);
  try {
    // Assume the payload contains a "tweet" field with the original tweet text.
    const reply = await generateReplyTweet(req.body);
    console.log("Generated reply tweet:", reply);
    res.status(200).json({ message: "Webhook processed", reply });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

app.get("/on", (req, res) => {
  receiveHealthCheck;
  console.log("niko on");
  res.status(200).send("Server on 👍");
});

app.listen(PORT, () => {
  startHealthCheckTimer();
  console.log(`Server listening on port ${PORT}`);
});
