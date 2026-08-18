import "dotenv/config";

import { app } from "./app.js";

app.listen(5000, () => {
  console.log("Successfully Connected");
});
