/*
Seals the contract to prevent further populates and renounce ownership
 */

import dotenv from 'dotenv';
dotenv.config();
import {sealContract} from "../helpers/seal_helper.js";

(async () => {
    await sealContract();
    process.exit(0);
})();
