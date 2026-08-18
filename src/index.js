import "dotenv/config";
import dns from "dns";
import { app } from "./app.js";
import connectDB from "./config/db.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Successfully Connected on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Failed:", error);
  });
