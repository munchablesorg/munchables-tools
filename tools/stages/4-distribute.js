import {distributeAll} from "../helpers/distribute_helper.js";

(async () => {
    console.log(`Distributing funds`);
    await distributeAll();
})();