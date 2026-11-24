import { app } from "./app.js";
import { startSpreadsheetWatcher } from "./src/services/spreadsheetService.js";

const port = Number(process.env.PORT || 3000);

app.listen(port, () => console.log(`G.A.I.A API ouvindo na porta http://localhost:${port}`));

startSpreadsheetWatcher();
